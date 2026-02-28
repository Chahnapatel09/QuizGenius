import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Zap, Brain, Sparkles, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

import API_URL from '../config';

const UploadPage = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [quizReady, setQuizReady] = useState(false);
    const [uploadStep, setUploadStep] = useState<'uploading' | 'configure'>('uploading');
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [quizMode, setQuizMode] = useState('Study Mode');
    const navigate = useNavigate();


    const onDrop = useCallback((acceptedFiles: File[]) => {
        // In a real app, we might want to limit to one file or validate types further
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt']
        },
        maxFiles: 1
    });

    const removeFile = (fileToRemove: File) => {
        setFiles(files.filter(file => file !== fileToRemove));
    };

    const handleContinueToConfig = () => {
        if (files.length === 0) return;
        setUploadStep('configure');
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadStep('uploading');
        setProgress(0);

        try {
            // Simulated progress while the file actually uploads
            const duration = 2000;
            const intervalTime = 50;
            const steps = duration / intervalTime;
            let currentStep = 0;

            const interval = setInterval(() => {
                currentStep++;
                // Cap at 90% until backend returns
                const p = Math.min(Math.floor((currentStep / steps) * 90), 90);
                setProgress(p);

                if (currentStep >= steps) {
                    clearInterval(interval);
                }
            }, intervalTime);

            const formData = new FormData();
            formData.append('file', files[0]);
            formData.append('num_questions', numQuestions.toString());
            formData.append('difficulty', difficulty);
            formData.append('mode', quizMode);

            const userEmail = localStorage.getItem('userEmail');
            if (!userEmail) {
                clearInterval(interval);
                alert("Please log in first to upload.");
                setIsUploading(false);
                return;
            }
            formData.append('email', userEmail);
            localStorage.setItem('recentQuizMode', quizMode); // Save chosen mode for QuizPage

            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                body: formData,
                credentials: 'include'
            });

            clearInterval(interval);

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Failed to upload file");
            }

            // Save generated quiz
            if (data.quiz && data.quiz.length > 0) {
                localStorage.setItem('recentQuiz', JSON.stringify(data.quiz));
            }
            if (data.document_id) {
                localStorage.setItem('recentDocumentId', data.document_id);
            }

            setProgress(100);

            // Wait slightly so user sees 100%
            setTimeout(() => {
                setIsUploading(false);
                setQuizReady(true);
            }, 500);

        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload: " + (error as Error).message);
            setIsUploading(false);
        }
    };

    const handleStartQuiz = () => {
        navigate('/quiz');
    };

    return (
        <>
            <div className="upload-page-bg"></div>

            <Navbar />

            <div className="app-container">
                <div className="upload-container" style={{ marginTop: '-1rem' }}>

                    <div className="upload-header">
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>{quizReady ? 'You\'re all set!' : 'Upload Your Notes'}</h1>
                        <p style={{ fontSize: '0.95rem' }}>{quizReady ? 'Your quiz is ready to go.' : 'Supported formats: PDF, TXT'}</p>
                    </div>


                    {!quizReady && (
                        <div
                            {...getRootProps()}
                            className={`dropzone ${isDragActive ? 'active' : ''} ${files.length > 0 ? 'has-file' : ''}`}
                            style={isUploading ? { pointerEvents: 'none' } : {}}
                        >
                            <input {...getInputProps()} />

                            <div className="dropzone-content">
                                {isUploading ? (
                                    <div className="loading-state">
                                        <div className="spinner-container">
                                            <div className="custom-spinner"></div>
                                            <Zap className="spinner-icon" size={24} />
                                        </div>
                                        <h2 className="loading-text">AI is generating the quiz</h2>
                                        <p className="loading-progress">{progress}% complete</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="upload-icon-wrapper">
                                            <UploadCloud size={48} />
                                        </div>
                                        {isDragActive ? (
                                            <p className="drop-text">Drop the files here ...</p>
                                        ) : (
                                            <>
                                                <p className="drop-text">Drag & drop files here, or click to select</p>
                                                <span className="drop-subtext">Max size: 10MB</span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {!isUploading && !quizReady && files.length > 0 && (
                        <div className="file-list">
                            {files.map((file, index) => (
                                <div key={index} className="file-item">
                                    <div className="file-info">
                                        <File size={20} className="file-icon" />
                                        <div className="file-details">
                                            <span className="file-name">{file.name}</span>
                                            <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFile(file)} className="remove-btn">
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}


                    {!isUploading && !quizReady && files.length > 0 && uploadStep === 'configure' && (
                        <div className="config-container" style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', marginBottom: '32px', textAlign: 'left' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-dark)' }}>Customize Your Quiz</h2>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', marginBottom: '10px' }}>Number of Questions</label>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {[5, 10, 15, 20].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setNumQuestions(num)}
                                            style={{ flex: '1', minWidth: '60px', padding: '12px', borderRadius: '12px', border: num === numQuestions ? '2px solid var(--primary)' : '2px solid #e2e8f0', background: num === numQuestions ? 'rgba(99, 102, 241, 0.05)' : 'white', color: num === numQuestions ? 'var(--primary)' : 'var(--text-gray)', fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', marginBottom: '10px' }}>Difficulty Level</label>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {['Easy', 'Medium', 'Hard'].map(diff => (
                                        <button
                                            key={diff}
                                            onClick={() => setDifficulty(diff)}
                                            style={{ flex: '1', padding: '12px', borderRadius: '12px', border: diff === difficulty ? '2px solid var(--primary)' : '2px solid #e2e8f0', background: diff === difficulty ? 'rgba(99, 102, 241, 0.05)' : 'white', color: diff === difficulty ? 'var(--primary)' : 'var(--text-gray)', fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', marginBottom: '10px' }}>Quiz Mode</label>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => setQuizMode('Study Mode')}
                                        style={{ flex: '1', padding: '16px', borderRadius: '16px', border: quizMode === 'Study Mode' ? '2px solid var(--primary)' : '2px solid #e2e8f0', background: quizMode === 'Study Mode' ? 'rgba(99, 102, 241, 0.05)' : 'white', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                                    >
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: quizMode === 'Study Mode' ? 'var(--primary)' : 'var(--text-dark)', marginBottom: '4px' }}>Study Mode</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Get immediate feedback and explanations.</div>
                                    </button>
                                    <button
                                        onClick={() => setQuizMode('Exam Mode')}
                                        style={{ flex: '1', padding: '16px', borderRadius: '16px', border: quizMode === 'Exam Mode' ? '2px solid var(--primary)' : '2px solid #e2e8f0', background: quizMode === 'Exam Mode' ? 'rgba(99, 102, 241, 0.05)' : 'white', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                                    >
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: quizMode === 'Exam Mode' ? 'var(--primary)' : 'var(--text-dark)', marginBottom: '4px' }}>Exam Mode</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>Test yourself, no feedback until the end.</div>
                                    </button>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-large generate-btn w-full"
                                onClick={handleUpload}
                                style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                            >
                                Generate AI Quiz
                            </button>
                        </div>
                    )}


                    {!isUploading && !quizReady && files.length > 0 && uploadStep === 'uploading' && (
                        <button
                            className={`btn btn-primary btn-large generate-btn`}
                            onClick={handleContinueToConfig}
                        >
                            Configure Quiz
                        </button>
                    )}


                    {quizReady && (
                        <div className="quiz-ready-card" role="alert" aria-live="polite">
                            <div className="quiz-ready-check-wrap">
                                <CheckCircle className="quiz-ready-check" size={40} strokeWidth={2} />
                            </div>
                            <h2 className="quiz-ready-title">
                                {numQuestions} questions ready!
                                <span className="quiz-ready-emoji" aria-hidden>🚀</span>
                            </h2>
                            <p className="quiz-ready-subtext">Click below to start your quiz</p>
                            <button
                                type="button"
                                className="btn-start-quiz"
                                onClick={handleStartQuiz}
                                aria-label="Start quiz"
                            >
                                <Zap size={20} strokeWidth={2.5} aria-hidden />
                                <span>Start Quiz</span>
                            </button>
                        </div>
                    )}


                    <div className="features-badges">
                        <div className="feature-badge">
                            <Zap size={16} />
                            <span>AI-Powered</span>
                        </div>
                        <div className="feature-badge">
                            <Brain size={16} />
                            <span>Smart Questions</span>
                        </div>
                        <div className="feature-badge">
                            <Sparkles size={16} />
                            <span>Instant Results</span>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default UploadPage;
