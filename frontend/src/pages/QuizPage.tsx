import { useState, useEffect } from 'react';
import { Trophy, CheckCircle, XCircle, Sparkles, ArrowRight, ArrowLeft, RefreshCw, Upload, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

import API_URL from '../config';

// Extended Mock Data
const ALL_QUESTIONS = [
    {
        id: 1,
        question: "What is the powerhouse of the cell?",
        options: [
            { id: 'A', text: "Nucleus" },
            { id: 'B', text: "Mitochondria" },
            { id: 'C', text: "Ribosome" },
            { id: 'D', text: "Endoplasmic Reticulum" }
        ],
        correctAnswer: 'B',
        explanation: "Mitochondria are often called the powerhouses of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
    },
    {
        id: 2,
        question: "Which planet is known as the Red Planet?",
        options: [
            { id: 'A', text: "Venus" },
            { id: 'B', text: "Mars" },
            { id: 'C', text: "Jupiter" },
            { id: 'D', text: "Saturn" }
        ],
        correctAnswer: 'B',
        explanation: "Mars is often referred to as the 'Red Planet' because of the reddish iron oxide prevalent on its surface."
    },
    {
        id: 3,
        question: "What is the chemical symbol for Gold?",
        options: [
            { id: 'A', text: "Au" },
            { id: 'B', text: "Ag" },
            { id: 'C', text: "Fe" },
            { id: 'D', text: "Pb" }
        ],
        correctAnswer: 'A',
        explanation: "The symbol 'Au' comes from the Latin word for gold, 'aurum'."
    },
    {
        id: 4,
        question: "Who wrote 'Romeo and Juliet'?",
        options: [
            { id: 'A', text: "Charles Dickens" },
            { id: 'B', text: "William Shakespeare" },
            { id: 'C', text: "Jane Austen" },
            { id: 'D', text: "Mark Twain" }
        ],
        correctAnswer: 'B',
        explanation: "William Shakespeare wrote Romeo and Juliet early in his career about two young star-crossed lovers whose deaths ultimately reconcile their feuding families."
    },
    {
        id: 5,
        question: "What is the largest ocean on Earth?",
        options: [
            { id: 'A', text: "Atlantic Ocean" },
            { id: 'B', text: "Indian Ocean" },
            { id: 'C', text: "Arctic Ocean" },
            { id: 'D', text: "Pacific Ocean" }
        ],
        correctAnswer: 'D',
        explanation: "The Pacific Ocean is the largest and deepest of Earth's oceanic divisions. It extends from the Arctic Ocean in the north to the Southern Ocean in the south."
    },
    {
        id: 6,
        question: "What is the speed of light?",
        options: [
            { id: 'A', text: "300,000 km/s" },
            { id: 'B', text: "150,000 km/s" },
            { id: 'C', text: "1,000 km/s" },
            { id: 'D', text: "Infinite" }
        ],
        correctAnswer: 'A',
        explanation: "The speed of light in vacuum is approximately 299,792,458 meters per second, often approximated as 300,000 kilometers per second."
    },
    {
        id: 7,
        question: "Which element has the atomic number 1?",
        options: [
            { id: 'A', text: "Helium" },
            { id: 'B', text: "Oxygen" },
            { id: 'C', text: "Hydrogen" },
            { id: 'D', text: "Carbon" }
        ],
        correctAnswer: 'C',
        explanation: "Hydrogen is the lightest element and has the atomic number 1."
    },
    {
        id: 8,
        question: "Who painted the Mona Lisa?",
        options: [
            { id: 'A', text: "Vincent van Gogh" },
            { id: 'B', text: "Pablo Picasso" },
            { id: 'C', text: "Leonardo da Vinci" },
            { id: 'D', text: "Michelangelo" }
        ],
        correctAnswer: 'C',
        explanation: "The Mona Lisa is a half-length portrait painting by Italian artist Leonardo da Vinci."
    },
    {
        id: 9,
        question: "What is the capital of Japan?",
        options: [
            { id: 'A', text: "Seoul" },
            { id: 'B', text: "Beijing" },
            { id: 'C', text: "Tokyo" },
            { id: 'D', text: "Bangkok" }
        ],
        correctAnswer: 'C',
        explanation: "Tokyo is the capital and most populous prefecture of Japan."
    },
    {
        id: 10,
        question: "What geometry shape has three sides?",
        options: [
            { id: 'A', text: "Square" },
            { id: 'B', text: "Triangle" },
            { id: 'C', text: "Pentagon" },
            { id: 'D', text: "Hexagon" }
        ],
        correctAnswer: 'B',
        explanation: "A triangle is a polygon with three edges and three vertices."
    }
];

interface Question {
    id: number;
    topic?: string;
    question: string;
    options: { id: string; text: string; }[];
    correctAnswer: string;
    explanation: string;
}

const QuizPage = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [isQuizComplete, setIsQuizComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [quizMode, setQuizMode] = useState<string>('Study Mode');
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [showReview, setShowReview] = useState(false);
    const [isHistoryView, setIsHistoryView] = useState(false);
    const [unattemptedCount, setUnattemptedCount] = useState(0);
    const navigate = useNavigate();

    const location = useLocation();


    useEffect(() => {
        try {

            const searchParams = new URLSearchParams(location.search);
            const historyId = searchParams.get('historyId');

            if (historyId) {

                const historyJson = localStorage.getItem('quizHistory');
                if (historyJson) {
                    const historyArray = JSON.parse(historyJson);
                    const historicalQuiz = historyArray.find((h: any) => h.id === historyId);

                    if (historicalQuiz && historicalQuiz.questions && historicalQuiz.userAnswers) {
                        setQuestions(historicalQuiz.questions);
                        setUserAnswers(historicalQuiz.userAnswers);
                        setScore(historicalQuiz.score);
                        setIsQuizComplete(true);
                        setIsHistoryView(true);
                        setShowReview(true);
                        setIsLoading(false);
                        return;
                    }
                }


                const fetchCloudHistory = async () => {
                    try {
                        const response = await fetch(`${API_URL}/api/quizzes/results/${historyId}`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (response.ok) {
                            const data = await response.json();
                            setQuestions(data.questions);
                            setUserAnswers(data.user_answers);
                            setScore(data.score);
                            setIsQuizComplete(true);
                            setIsHistoryView(true);
                            setShowReview(true);
                        } else {
                            console.error("Historical quiz not found in cloud.");
                            alert("This quiz history could not be found.");
                            navigate('/dashboard');
                        }
                    } catch (e) {
                        console.error("Cloud history fetch failed:", e);
                        alert("Error loading quiz history.");
                        navigate('/dashboard');
                    } finally {
                        setIsLoading(false);
                    }
                };
                fetchCloudHistory();
                return;
            }


            const savedQuizJson = localStorage.getItem('recentQuiz');
            if (savedQuizJson) {
                const parsedQuiz = JSON.parse(savedQuizJson);
                if (Array.isArray(parsedQuiz) && parsedQuiz.length > 0) {
                    setQuestions(parsedQuiz);
                    setIsLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.error("Failed to parse saved quiz", e);
        }

        // Fallback
        const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 5));
        setIsLoading(false);
    }, [location.search]);

    // Load Quiz Mode Configuration
    useEffect(() => {
        const mode = localStorage.getItem('recentQuizMode');
        if (mode) setQuizMode(mode);
    }, []);

    const currentQuestion = questions[currentQuestionIndex];

    // Guard clause against empty state before useEffect runs
    if (isLoading || !currentQuestion) {
        return <div className="quiz-page-bg"></div>;
    }

    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    const handleOptionSelect = (optionId: string) => {
        if (isAnswered && quizMode === 'Study Mode') return;

        setSelectedOption(optionId);
        setIsAnswered(true);

        setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionId }));

        // Only count score in real-time for Study Mode, Exam mode calculated at end
        if (quizMode === 'Study Mode') {
            if (optionId === currentQuestion.correctAnswer && selectedOption !== currentQuestion.correctAnswer) {
                // Just in case they change their mind before it locks? Study mode locks instantly.
                setScore(prev => prev + 1);
            }
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            const prevIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(prevIndex);
            const savedAnswer = userAnswers[prevIndex] || null;
            setSelectedOption(savedAnswer);
            setIsAnswered(!!savedAnswer);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            const savedAnswer = userAnswers[nextIndex] || null;
            setSelectedOption(savedAnswer);
            setIsAnswered(!!savedAnswer);
        } else {
            let finalScore = 0;
            let unattempted = 0;
            const weakTopics = new Set<string>();

            questions.forEach((q, idx) => {
                const userAns = idx === currentQuestionIndex ? selectedOption : userAnswers[idx];
                if (!userAns) {
                    unattempted++;
                } else if (userAns === q.correctAnswer) {
                    finalScore++;
                } else if (q.topic) {
                    weakTopics.add(q.topic);
                }
            });

            setScore(finalScore);
            setUnattemptedCount(unattempted);
            setIsQuizComplete(true);


            const finalAnswers = { ...userAnswers };
            finalAnswers[currentQuestionIndex] = selectedOption || '';
            const quizId = Math.random().toString(36).substring(2, 10);


            fetch(`${API_URL}/api/quizzes/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    score: finalScore,
                    total: questions.length,
                    questions: questions,
                    user_answers: finalAnswers
                })
            }).catch(err => console.error("Cloud save failed:", err));


            try {
                const historyJson = localStorage.getItem('quizHistory');
                const history = historyJson ? JSON.parse(historyJson) : [];

                history.push({
                    id: quizId,
                    date: new Date().toISOString(),
                    score: finalScore,
                    total: questions.length,
                    questions: questions,
                    userAnswers: finalAnswers
                });

                // Keep only the last 15 quizzes to prevent local storage quota limits
                const trimmedHistory = history.slice(-15);
                localStorage.setItem('quizHistory', JSON.stringify(trimmedHistory));


                if (weakTopics.size > 0) {
                    localStorage.setItem('recentWeakTopics', JSON.stringify(Array.from(weakTopics)));
                } else {
                    localStorage.removeItem('recentWeakTopics');
                }
            } catch (e) {
                console.error("Failed to save history", e);
            }
        }
    };


    if (isLoading) {
        return (
            <div className="quiz-page-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <RefreshCw className="spinner-icon" size={48} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                    <h2 style={{ color: 'white' }}>AI is generating new questions...</h2>
                </div>
                <style>
                    {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    `}
                </style>
            </div>
        );
    }

    if (isQuizComplete) {
        const percentage = Math.round((score / questions.length) * 100);

        // Collect weak topics from state matching questions
        const weakTopics = new Set<string>();
        questions.forEach((q, idx) => {
            const userAns = userAnswers[idx];
            if (userAns !== q.correctAnswer && q.topic) {
                weakTopics.add(q.topic);
            }
        });

        const weakTopicsArray = Array.from(weakTopics);

        return (
            <>
                <div className="upload-page-bg"></div>

                <Navbar />

                <div className="creative-result-wrapper">
                    <div className="creative-glass-card">

                        <div className="creative-score-hero">
                            <div className="creative-score-circle">
                                <span className="creative-score-value">{percentage}%</span>
                                <span className="creative-score-label">Score</span>
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                            {percentage >= 80 ? "Amazing work!" : percentage >= 50 ? "Good job!" : "Keep practicing!"}
                        </h2>
                        <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            You answered {score} out of {questions.length} questions correctly.
                        </p>

                        <div className="creative-stats-row" style={{ marginBottom: '1.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div className="creative-stat-pill correct" style={{ padding: '0.4rem 0.8rem' }}>
                                <div className="icon"><CheckCircle size={16} /></div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="creative-stat-number" style={{ fontSize: '0.95rem' }}>{score}</span>
                                    <span className="creative-stat-text" style={{ fontSize: '0.7rem' }}>Correct</span>
                                </div>
                            </div>
                            <div className="creative-stat-pill incorrect" style={{ padding: '0.4rem 0.8rem' }}>
                                <div className="icon"><XCircle size={16} /></div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span className="creative-stat-number" style={{ fontSize: '0.95rem' }}>{questions.length - score - unattemptedCount}</span>
                                    <span className="creative-stat-text" style={{ fontSize: '0.7rem' }}>Incorrect</span>
                                </div>
                            </div>
                            {quizMode === 'Exam Mode' && unattemptedCount > 0 && (
                                <div className="creative-stat-pill unattempted" style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                                    <div className="icon" style={{ color: '#64748b', background: '#f8fafc', padding: '0.5rem', borderRadius: '50%' }}><Sparkles size={16} /></div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <span className="creative-stat-number" style={{ fontSize: '0.95rem', color: '#475569' }}>{unattemptedCount}</span>
                                        <span className="creative-stat-text" style={{ fontSize: '0.7rem', color: '#64748b' }}>Skipped</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {weakTopicsArray.length > 0 && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(239,68,68,0.1)', marginBottom: '1.5rem', textAlign: 'left' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertCircle size={14} /> Concepts to Review
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {weakTopicsArray.map((topic, i) => (
                                        <span key={i} style={{ background: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#dc2626', border: '1px solid #fca5a5' }}>
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isHistoryView && (
                            <div className="creative-actions-row">
                                <button onClick={() => setShowReview(!showReview)} className="creative-btn creative-btn-outline">
                                    <Sparkles size={20} />
                                    {showReview ? 'Hide Mistakes Review' : 'Review Mistakes'}
                                    {showReview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <button onClick={() => navigate('/upload')} className="creative-btn creative-btn-secondary">
                                    <Upload size={20} /> Upload New Notes
                                </button>
                            </div>
                        )}


                        {showReview && (
                            <div className="creative-review-section">
                                <div className="creative-review-header">
                                    <CheckCircle size={24} color="var(--primary)" />
                                    {isHistoryView ? 'Review Your Results' : 'Review Mistakes'}
                                </div>

                                {questions.map((q, idx) => {
                                    const userAnswerLabel = userAnswers[idx];
                                    const isUnattempted = !userAnswerLabel;
                                    const isCorrect = userAnswerLabel === q.correctAnswer;

                                    const userAnswerText = q.options.find(o => o.id === userAnswerLabel)?.text || 'Not Attempted';
                                    const correctAnswerText = q.options.find(o => o.id === q.correctAnswer)?.text;

                                    let cardBorder = isCorrect ? '4px solid #10b981' : isUnattempted ? '4px solid #94a3b8' : '4px solid #ef4444';
                                    let iconColor = isCorrect ? '#10b981' : isUnattempted ? '#64748b' : '#ef4444';

                                    return (
                                        <div key={idx} className={`creative-mistake-card ${isCorrect ? 'is-correct' : isUnattempted ? 'is-unattempted' : ''}`} style={{ opacity: (isCorrect || isUnattempted) ? 0.9 : 1, borderLeft: cardBorder }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <div style={{ color: iconColor, marginTop: '2px' }}>
                                                    {isCorrect ? <CheckCircle size={22} /> : isUnattempted ? <Sparkles size={22} /> : <XCircle size={22} />}
                                                </div>
                                                <div className="creative-mistake-question">
                                                    <span style={{ color: isCorrect ? '#10b981' : '#ef4444', marginRight: '8px' }}>Q{idx + 1}.</span>
                                                    {q.question}
                                                </div>
                                            </div>

                                            <div className="creative-mistake-answers">
                                                <div className={`creative-ans-box ${isCorrect ? 'right' : isUnattempted ? 'skipped' : 'wrong'}`} style={{ borderLeft: isUnattempted ? '3px solid #94a3b8' : '' }}>
                                                    <span className="creative-ans-label">
                                                        {isCorrect ? <CheckCircle size={14} /> : isUnattempted ? <Sparkles size={14} /> : <XCircle size={14} />}
                                                        {isUnattempted ? 'Your Selection' : 'Your Answer'}
                                                    </span>
                                                    <span className="creative-ans-text" style={{ fontStyle: isUnattempted ? 'italic' : 'normal', color: isUnattempted ? '#64748b' : 'inherit' }}>{userAnswerText}</span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="creative-ans-box right">
                                                        <span className="creative-ans-label">
                                                            <CheckCircle size={14} /> Correct Answer
                                                        </span>
                                                        <span className="creative-ans-text">{correctAnswerText}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="creative-mistake-explanation">
                                                <div>
                                                    <div className="creative-mistake-explanation-header">
                                                        <Sparkles size={16} /> Explanation
                                                    </div>
                                                    {q.explanation}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {score === questions.length && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '2rem', fontWeight: 600 }}>
                                        You got everything correct! No mistakes to review. ✨
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="quiz-page-bg"></div>

            <Navbar />

            <div className="app-container quiz-layout" style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px 20px' }}>      <div className="quiz-header">
                <div className="progress-container">
                    <div className="progress-badge">
                        {currentQuestionIndex + 1} / {questions.length}
                    </div>
                    <div className="progress-bar-track">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="score-badge">
                    <Trophy size={18} />
                    <span>{score}</span>
                </div>
            </div>

                <div className="question-container">
                    <h2 className="question-text">{currentQuestion.question}</h2>

                    <div className="options-grid">
                        {currentQuestion.options.map((option) => {
                            const isSelected = selectedOption === option.id;
                            const isCorrect = option.id === currentQuestion.correctAnswer;
                            const isExamMode = quizMode === 'Exam Mode';

                            let optionClass = "option-card";
                            if (isAnswered) {
                                if (isExamMode) {
                                    if (isSelected) optionClass += " selected";
                                } else {
                                    if (isSelected && isCorrect) optionClass += " correct";
                                    else if (isSelected && !isCorrect) optionClass += " incorrect";
                                    else if (!isSelected && isCorrect) optionClass += " correct-reveal";
                                }
                            }

                            return (
                                <button
                                    key={option.id}
                                    className={optionClass}
                                    onClick={() => handleOptionSelect(option.id)}
                                    disabled={isAnswered && quizMode === 'Study Mode'}
                                >
                                    <div className="option-label">{option.id}</div>
                                    <span className="option-text">{option.text}</span>

                                    {/* Only show icons if non exam mode */}
                                    {!isExamMode && isAnswered && isSelected && isCorrect && <CheckCircle className="status-icon" size={20} />}
                                    {!isExamMode && isAnswered && isSelected && !isCorrect && <XCircle className="status-icon" size={20} />}
                                </button>
                            );
                        })}
                    </div>

                    {isAnswered && quizMode === 'Study Mode' && (
                        <div className="explanation-card">
                            <div className="explanation-content">
                                <div className="explanation-icon">
                                    <Sparkles size={24} />
                                </div>
                                <div className="explanation-text">
                                    <h3>Explanation</h3>
                                    <p>{currentQuestion.explanation}</p>
                                </div>
                            </div>
                            <button onClick={handleNext} className="next-btn">
                                Next Question
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {quizMode === 'Exam Mode' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                            <button
                                onClick={handlePrevious}
                                disabled={currentQuestionIndex === 0}
                                className="btn btn-primary"
                            >
                                <ArrowLeft size={18} />
                                Previous
                            </button>
                            <button
                                onClick={handleNext}
                                className="btn btn-primary"
                            >
                                {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Exam"}
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
};

export default QuizPage;
