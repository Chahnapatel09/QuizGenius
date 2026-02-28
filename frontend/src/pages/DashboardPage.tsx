import { BookOpen, Trophy, Target, Zap, Clock, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

import API_URL from '../config';

const DashboardPage = () => {
    const navigate = useNavigate();
    const userName = localStorage.getItem('userName') || 'Friend';

    const [recentQuizzes, setRecentQuizzes] = useState<{ id?: string, score: number, total: number, date: string, type: string }[]>([]);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [metrics, setMetrics] = useState({
        totalQuizzes: 0,
        avgScore: 0,
        bestScore: 0,
        studyStreak: 3
    });

    const handleViewAll = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quizzes/history?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const all = data.items.map((h: any) => ({
                    id: h.result_id,
                    date: new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    score: h.score,
                    total: h.total,
                    type: 'quiz'
                }));
                setRecentQuizzes(all);
                setShowAllHistory(true);
            }
        } catch (e) {
            console.error("Failed to fetch all history", e);
        }
    };

    const handleDeleteQuiz = async (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation(); // Don't trigger navigation
        if (!window.confirm("Are you sure you want to delete this quiz result?")) return;

        try {
            const response = await fetch(`${API_URL}/api/quizzes/results/${quizId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                // Remove from state
                const newQuizzes = recentQuizzes.filter(q => q.id !== quizId);
                setRecentQuizzes(newQuizzes);

                // Recalculate basic metrics based on remaining quizzes
                if (newQuizzes.length > 0) {
                    const total = newQuizzes.length;
                    const sum = newQuizzes.reduce((acc, curr) => acc + (curr.score / curr.total), 0);
                    const best = Math.max(...newQuizzes.map(q => (q.score / q.total) * 100));

                    setMetrics(prev => ({
                        ...prev,
                        totalQuizzes: total,
                        avgScore: Math.round((sum / total) * 100),
                        bestScore: Math.round(best)
                    }));
                } else {
                    setMetrics({
                        totalQuizzes: 0,
                        avgScore: 0,
                        bestScore: 0,
                        studyStreak: 0
                    });
                }
            } else {
                alert("Failed to delete quiz result.");
            }
        } catch (error) {
            console.error("Delete failed:", error);
            alert("An error occurred while deleting.");
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_URL}/api/quizzes/history`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const { items: history, metrics: cloudMetrics } = data;

                    if (Array.isArray(history)) {
                        setMetrics(cloudMetrics);

                        const recent = history.map((h: any) => ({
                            id: h.result_id,
                            date: new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                            score: h.score,
                            total: h.total,
                            type: 'quiz'
                        }));
                        setRecentQuizzes(recent);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch history from cloud", e);

                // Fallback to local storage if cloud fails (optional logging)
                localStorage.getItem('quizHistory');
            }
        };

        fetchHistory();
    }, []);

    return (
        <>
            <div className="dashboard-page-bg" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#f8fafc', zIndex: -1 }}></div>

            <Navbar />

            <div className="app-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '30px', paddingBottom: '40px', paddingLeft: '24px', paddingRight: '24px' }}>

                <div className="dashboard-header" style={{ marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                        Ready to crush it today, {userName}? 🚀
                    </h1>
                    <p style={{ color: 'var(--text-gray)', fontSize: '15px' }}>Here's a look at your recent learning progress.</p>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>


                    <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02))', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)' }}>
                                <Target size={16} />
                            </div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', margin: 0 }}>Total Quizzes</h3>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)' }}>{metrics.totalQuizzes}</div>
                    </div>


                    <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10B981' }}>
                                <Trophy size={16} />
                            </div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', margin: 0 }}>Avg Score</h3>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'baseline' }}>
                            {metrics.totalQuizzes === 0 ? '--' : metrics.avgScore}
                            {metrics.totalQuizzes > 0 && <span style={{ fontSize: '16px', color: 'var(--text-gray)', marginLeft: '4px' }}>%</span>}
                        </div>
                    </div>


                    <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#F59E0B' }}>
                                <Zap size={16} />
                            </div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', margin: 0 }}>Study Streak</h3>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'baseline' }}>
                            {metrics.studyStreak} <span style={{ fontSize: '16px', color: 'var(--text-gray)', marginLeft: '6px' }}>{metrics.studyStreak === 1 ? 'Day' : 'Days'}</span>
                        </div>
                    </div>


                    <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(236,72,153,0.02))', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#EC4899' }}>
                                <Clock size={16} />
                            </div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-gray)', margin: 0 }}>Best Score</h3>
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)', display: 'flex', alignItems: 'baseline' }}>
                            {metrics.totalQuizzes === 0 ? '--' : metrics.bestScore}
                            {metrics.totalQuizzes > 0 && <span style={{ fontSize: '16px', color: 'var(--text-gray)', marginLeft: '4px' }}>%</span>}
                        </div>
                    </div>

                </div>


                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>
                            {showAllHistory ? 'Full Quiz History' : 'Recent Quizzes'}
                        </h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {metrics.totalQuizzes > 3 && !showAllHistory && (
                                <button
                                    onClick={handleViewAll}
                                    className="btn"
                                    style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.05)', padding: '6px 14px', fontSize: '13px', borderRadius: '8px', fontWeight: 600 }}
                                >
                                    View All
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/upload')}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                            >
                                <Upload size={16} />
                                Upload New Notes
                            </button>
                        </div>
                    </div>

                    {recentQuizzes.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                            <div style={{ display: 'inline-flex', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
                                <BookOpen size={20} />
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '6px' }}>No quizzes taken yet</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-gray)', marginBottom: '16px', maxWidth: '260px', margin: '0 auto 16px' }}>Upload your first document to generate a quiz and start tracking your progress.</p>
                            <button onClick={() => navigate('/upload')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                Generate Your First Quiz
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentQuizzes.map((quiz, i) => {
                                const scorePct = Math.round((quiz.score / quiz.total) * 100);
                                const isGreat = scorePct >= 80;
                                const isGood = scorePct >= 60 && scorePct < 80;

                                return (
                                    <div
                                        key={i}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fcfcfd', transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        className="hover:border-indigo-100 hover:shadow-sm"
                                        onClick={() => {
                                            if (quiz.id) {
                                                navigate(`/quiz?historyId=${quiz.id}`);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isGreat ? 'rgba(16, 185, 129, 0.1)' : isGood ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: isGreat ? '#10B981' : isGood ? '#3B82F6' : '#F59E0B', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <Trophy size={18} />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)', margin: '0 0 2px 0' }}>Score: {quiz.score}/{quiz.total}</h4>
                                                <p style={{ fontSize: '12px', color: 'var(--text-gray)', margin: 0 }}>Taken on {quiz.date}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ fontSize: '15px', fontWeight: '700', color: isGreat ? '#10B981' : isGood ? '#3B82F6' : '#F59E0B' }}>{scorePct}%</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: '500' }}>{quiz.score}/{quiz.total} correctly</div>
                                            </div>
                                            <button
                                                onClick={(e) => quiz.id && handleDeleteQuiz(e, quiz.id)}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    color: '#ef4444',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="hover:bg-red-50"
                                                title="Delete Quiz"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

export default DashboardPage;
