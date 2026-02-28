import json
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import boto3
import botocore
from boto3.dynamodb.conditions import Key
import bcrypt
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from decimal import Decimal

def convert_decimals(obj):
    """Recursively convert DynamoDB Decimal types to standard Python floats/ints."""
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    return obj

load_dotenv()

app = FastAPI(title="QuizGenius API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        os.getenv("FRONTEND_URL", ""), # Add Production Frontend URL from .env
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS DynamoDB setup
dynamodb = boto3.resource(
    "dynamodb",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
)
users_table = dynamodb.Table("QuizGeniusUsers")
documents_table = dynamodb.Table("QuizGeniusDocuments")
groq_responses_table = dynamodb.Table("QuizGeniusGroqResponses")
results_table = dynamodb.Table("QuizGeniusResults")

# S3
s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
)
S3_BUCKET = os.getenv("S3_BUCKET", "")

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    # Fallback only for local development - production MUST set this in .env
    JWT_SECRET = "quizgenius-dev-secret-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7
SESSION_COOKIE_NAME = "session_token"
SESSION_COOKIE_MAX_AGE = 7 * 24 * 3600  # 7 days in seconds


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class QuizResultRequest(BaseModel):
    score: int
    total: int
    questions: list
    user_answers: dict


security = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    return {"email": payload["email"], "name": payload["name"]}


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    token = None
    if credentials and credentials.scheme == "Bearer":
        token = credentials.credentials
    if not token:
        token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid authorization.")
    try:
        return _decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def create_token(email: str, name: str) -> str:
    payload = {
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/signup")
def signup(req: SignupRequest):
    # Check if user already exists
    response = users_table.get_item(Key={"email": req.email})
    if "Item" in response:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Hash password
    password_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Store user in DynamoDB
    users_table.put_item(
        Item={
            "email": req.email,
            "name": req.name,
            "password_hash": password_hash,
            "created_at": datetime.utcnow().isoformat(),
        }
    )

    # Generate JWT and set session cookie
    token = create_token(req.email, req.name)
    response = JSONResponse(content={"token": token, "name": req.name, "email": req.email})
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_COOKIE_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@app.post("/api/login")
def login(req: LoginRequest):
    # Look up user in DynamoDB
    response = users_table.get_item(Key={"email": req.email})
    if "Item" not in response:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user = response["Item"]

    # Verify password
    if not bcrypt.checkpw(req.password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")


    token = create_token(req.email, user["name"])
    response = JSONResponse(content={"token": token, "name": user["name"], "email": req.email})
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_COOKIE_MAX_AGE,
        path="/",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response


@app.get("/api/session")
def session_verify(request: Request):
    """Verify JWT from cookie and return current user. Call on app startup to restore session."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        user = _decode_token(token)
        return {"name": user["name"], "email": user["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")


@app.post("/api/logout")
def logout():
    """Clear session cookie."""
    response = JSONResponse(content={"ok": True})
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return response


ALLOWED_CONTENT_TYPES = {"application/pdf", "text/plain"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


import PyPDF2
import io
from groq import Groq

groq_client = Groq()

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    num_questions: int = Form(5),
    difficulty: str = Form("Medium"),
    mode: str = Form("Study Mode"),
    current_user: dict = Depends(get_current_user),
):
    if not S3_BUCKET:
        raise HTTPException(
            status_code=503,
            detail="S3 bucket not configured. Set S3_BUCKET in environment.",
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and plain text files are allowed.",
        )

    body = await file.read()
    if len(body) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File size must not exceed {MAX_FILE_SIZE_BYTES // (1024*1024)}MB.",
        )

    document_id = str(uuid.uuid4())
    safe_name = "".join(c for c in file.filename or "document" if c.isalnum() or c in "._- ") or "document"
    s3_key = f"documents/{current_user['email']}/{safe_name}"

    # Store file directly in S3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=body,
            ContentType=content_type,
        )
    except botocore.exceptions.ClientError as e:
        print(f"Warning: S3 PutObject failed (Expected in AWS Learner Labs). Bypassing and continuing quiz generation: {e}")

    uploaded_at = datetime.utcnow().isoformat()
    try:
        documents_table.put_item(
            Item={
                "document_id": document_id,
                "user_email": current_user["email"],
                "s3_bucket": S3_BUCKET,
                "s3_key": s3_key,
                "original_filename": file.filename or "document",
                "content_type": content_type,
                "file_size_bytes": len(body),
                "uploaded_at": uploaded_at,
                "for_preview": True,
            }
        )
    except botocore.exceptions.ClientError as e:
        print(f"Warning: DynamoDB PutItem failed for 'QuizGeniusDocuments' (Expected in AWS Learner Labs). Bypassing: {e}")

    extracted_text = ""
    try:
        if content_type == "application/pdf":
            reader = PyPDF2.PdfReader(io.BytesIO(body))
            for page in reader.pages:
                extracted_text += page.extract_text() + "\n"
        else:
            extracted_text = body.decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Text extraction failed: {e}")
        extracted_text = "Failed to extract text from document."

    quiz_json = await generate_quiz_from_text(extracted_text, document_id, current_user["email"], num_questions, difficulty, mode)

    return {
        "document_id": document_id,
        "s3_bucket": S3_BUCKET,
        "s3_key": s3_key,
        "original_filename": file.filename,
        "file_size_bytes": len(body),
        "uploaded_at": uploaded_at,
        "quiz": quiz_json
    }

async def generate_quiz_from_text(extracted_text: str, document_id: str, email: str, num_questions: int = 5, difficulty: str = "Medium", mode: str = "Study Mode") -> list:
    # Limit text to avoid exceeding prompt context length
    extracted_text = extracted_text[:15000]

    prompt_content = f"""
You are a university-level assessment generator designed for Master's students. Your task is to generate high-quality, technical, and concept-driven quiz questions based strictly on the provided lecture notes.

### CORE RULES:
1. **Academic Level**: Generate questions at a Master's academic level.
2. **Focus**: Prioritize conceptual depth, application, and analytical thinking.
3. **Rigorous Standards**: Avoid simple definition-based or trivial recall questions unless the difficulty is set to 'Easy'.
4. **Style**: Use scenario-based or problem-solving questions where appropriate. Questions must resemble university exam or midterm questions.
5. **Precision**: Questions must be technically accurate and precise. Do not invent information not present in the notes.
6. **Application of Theory**: Questions should resemble those seen in graduate-level university exams where students must apply theory to new and unfamiliar situations.
7. **Content Extraction**: 
   - Extract only examinable academic material.
   - Discard image captions without explanation, decorative elements, page numbers, repeated headers, or non-technical comments.
   - If diagrams/images are described in text, extract only the conceptual meaning. Ignore purely visual references.

### DIFFICULTY-SPECIFIC EXPECTATIONS:
- **EASY (Foundational Master's Level)**:
  - Focus on core concepts and theoretical understanding.
  - Test understanding (e.g., clear definitions with a minor applied twist), not just memorization.
  - Avoid deep multi-step reasoning or extremely tricky distractors.

- **MEDIUM (Applied Conceptual)**:
  - Focus on interpretation, comparing related concepts, and identifying correct approaches.
  - Use small scenarios that require reasoning beyond simple recall.
  - Distractors must be plausible and technically close to the correct answer.

- **HARD (Advanced Technical/Scenario-Based)**: 
  - **Your main focus.** Difficulty must resemble a university final exam question.
  - Require understanding of underlying mechanisms and multi-step reasoning.
  - Focus on edge cases, concept integration, and analytical thinking.
  - Use real-world or research-based scenarios / small case studies.
  - Test subtle differences between similar concepts.
  - Avoid surface-level recall, obvious answers, or pure memorization.

### CONFIGURATION:
- **Number of questions**: {num_questions}
- **Target Difficulty**: {difficulty}
- **Target Mode**: {mode} (If Exam Mode, ensure questions are more rigorous and test deep understanding)

### LECTURE NOTES CONTENT:
\"\"\"
{extracted_text}
\"\"\"

Output your response STRICTLY as a JSON array where each object has the following structure:
[
  {{
    "id": 1,
    "topic": "The brief subject or theme of the question",
    "question": "Question text here?",
    "options": [
      {{ "id": "A", "text": "Option A text" }},
      {{ "id": "B", "text": "Option B text" }},
      {{ "id": "C", "text": "Option C text" }},
      {{ "id": "D", "text": "Option D text" }}
    ],
    "correctAnswer": "A",
    "explanation": "Explanation of why A is correct."
  }}
]
Make sure the response is valid JSON and nothing else. No markdown formatting wrapped around it. Ensure there are exactly {num_questions} questions.
"""

    quiz_json = []
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt_content}],
            temperature=0.8,
            max_completion_tokens=2048,
        )
        groq_response = completion.choices[0].message.content or "[]"
        
        if groq_response.startswith("```json"):
            groq_response = groq_response[7:-3].strip()
        elif groq_response.startswith("```"):
            groq_response = groq_response[3:-3].strip()
            
        quiz_json = json.loads(groq_response)
        
        # Save to DynamoDB
        store_groq_response(document_id, email, quiz_json)
    except Exception as e:
        print(f"Groq generation failed: {e}")
        # Could fallback to an error message or empty quiz
    return quiz_json

class GenerateQuizRequest(BaseModel):
    document_id: str
    num_questions: int = 5
    difficulty: str = "Medium"
    mode: str = "Study Mode"

@app.post("/api/quiz/generate")
async def generate_another_quiz(
    req: GenerateQuizRequest,
    current_user: dict = Depends(get_current_user),
):
    # Lookup document
    response = documents_table.get_item(Key={"document_id": req.document_id})
    if "Item" not in response:
         raise HTTPException(status_code=404, detail="Document not found.")
    
    doc = response["Item"]
    if doc["user_email"] != current_user["email"]:
         raise HTTPException(status_code=403, detail="Unauthorized access to document.")

    s3_key = doc["s3_key"]
    content_type = doc["content_type"]

    # Fetch from S3
    try:
        s3_resp = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        body = s3_resp['Body'].read()
    except Exception as e:
        print("Failed to fetch from S3:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve document from storage.")

    # Extract text
    extracted_text = ""
    try:
        if content_type == "application/pdf":
            reader = PyPDF2.PdfReader(io.BytesIO(body))
            for page in reader.pages:
                extracted_text += page.extract_text() + "\n"
        else:
            extracted_text = body.decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Text extraction failed: {e}")
        extracted_text = "Failed to extract text from document."

    quiz_json = await generate_quiz_from_text(
        extracted_text, 
        req.document_id, 
        current_user["email"],
        req.num_questions,
        req.difficulty,
        req.mode
    )
    
    return {"quiz": quiz_json}

    return {
        "document_id": document_id,
        "s3_bucket": S3_BUCKET,
        "s3_key": s3_key,
        "original_filename": file.filename,
        "file_size_bytes": len(body),
        "uploaded_at": uploaded_at,
        "quiz": quiz_json
    }


def store_groq_response(document_id: str, user_email: str, response: str | dict) -> None:
    """Store Groq API response in DynamoDB. Pass response as JSON string or dict (will be stored as string)."""
    payload = response if isinstance(response, str) else json.dumps(response)
    created_at = datetime.utcnow().isoformat()
    try:
        groq_responses_table.put_item(
            Item={
                "document_id": document_id,
                "user_email": user_email,
                "response_payload": payload,
                "created_at": created_at,
            }
        )
    except botocore.exceptions.ClientError as e:
        print(f"Warning: DynamoDB PutItem failed for 'QuizGeniusGroqResponses' (Expected in AWS Learner Labs). Bypassing: {e}")


@app.get("/api/quizzes/history")
def get_quiz_history(limit: int = 3, current_user: dict = Depends(get_current_user)):
    """Fetch the latest quiz results and summary metrics for the current user."""
    print(f"DEBUG: Fetching history for user: {current_user['email']}, limit: {limit}")
    try:
        all_response = results_table.query(
            IndexName="by_user",
            KeyConditionExpression=Key("user_email").eq(current_user["email"]),
            ScanIndexForward=False  # Sort descending by created_at
        )
        
        all_items = all_response.get("Items", [])
        total_quizzes = len(all_items)
        
        avg_score = 0
        best_score = 0
        if total_quizzes > 0:
            total_pct = sum(round((float(i["score"]) / float(i["total"])) * 100) for i in all_items)
            avg_score = round(total_pct / total_quizzes)
            best_score = max(round((float(i["score"]) / float(i["total"])) * 100) for i in all_items)

        return {
            "items": convert_decimals(all_items[:limit]),
            "metrics": {
                "totalQuizzes": total_quizzes,
                "avgScore": avg_score,
                "bestScore": best_score,
                "studyStreak": min(total_quizzes, 5) if total_quizzes > 2 else 1
            }
        }
    except Exception as e:
        print(f"Failed to fetch history: {e}")
        return {"items": [], "metrics": {"totalQuizzes": 0, "avgScore": 0, "bestScore": 0, "studyStreak": 0}}


@app.post("/api/quizzes/results")
def save_quiz_result(req: QuizResultRequest, current_user: dict = Depends(get_current_user)):
    """Store a completed quiz result in DynamoDB."""
    result_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    
    try:
        results_table.put_item(
            Item={
                "result_id": result_id,
                "user_email": current_user["email"],
                "score": req.score,
                "total": req.total,
                "questions": req.questions,
                "user_answers": req.user_answers,
                "created_at": created_at
            }
        )
        return {"result_id": result_id, "status": "saved"}
    except botocore.exceptions.ClientError as e:
        print(f"Failed to save quiz result: {e}")
        raise HTTPException(status_code=500, detail="Failed to save results to database.")


@app.get("/api/quizzes/results/{result_id}")
def get_quiz_result(result_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch a specific quiz result by its ID."""
    try:
        response = results_table.get_item(Key={"result_id": result_id})
        if "Item" not in response:
            raise HTTPException(status_code=404, detail="Result not found.")
        
        result = response["Item"]
        if result["user_email"] != current_user["email"]:
            raise HTTPException(status_code=403, detail="Unauthorized access to result.")
            
        return convert_decimals(result)
    except botocore.exceptions.ClientError as e:
        print(f"Failed to fetch result: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve result from database.")


@app.delete("/api/quizzes/results/{result_id}")
def delete_quiz_result(result_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a specific quiz result by its ID."""
    try:
        # First check ownership
        response = results_table.get_item(Key={"result_id": result_id})
        if "Item" not in response:
            raise HTTPException(status_code=404, detail="Result not found.")
        
        if response["Item"]["user_email"] != current_user["email"]:
            raise HTTPException(status_code=403, detail="Unauthorized.")
            
        results_table.delete_item(Key={"result_id": result_id})
        return {"status": "deleted", "result_id": result_id}
    except botocore.exceptions.ClientError as e:
        print(f"Failed to delete result: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete result from database.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
