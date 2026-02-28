import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, FileUp, Cpu, Trophy, Clock, Brain, Gamepad2, User } from 'lucide-react';
import Navbar from '../components/Navbar';

const LandingPage = () => {
    return (
        <>
            <Navbar />

            <div className="app-container">

                {/* Hero Section */}
                <main className="hero">


                    <h1 className="headline">
                        Transform Your
                        <span className="gradient-text"> Lecture Notes</span><br />
                        into Success.
                    </h1>

                    <p className="subhead">
                        Upload your documents and create personalized quizzes
                        that help you master concepts faster than ever before.
                    </p>

                    <Link to="/login" className="btn btn-primary btn-large">
                        Get Started
                        <ArrowRight size={20} />
                    </Link>


                </main>

                {/* Process Section */}
                <section className="process-section">
                    <div className="section-header">
                        <span className="section-label">THE PROCESS</span>
                        <h2 className="section-title">Simple. Fast. Effective.</h2>
                    </div>

                    <div className="process-grid">
                        <div className="process-card">
                            <div className="icon-box">
                                <FileUp size={32} className="text-primary" />
                            </div>
                            <h3>Upload</h3>
                            <p>
                                Drop your lecture notes PDFs or text files.
                            </p>
                        </div>


                        <div className="process-card">
                            <div className="icon-box">
                                <Cpu size={32} className="text-primary" />
                            </div>
                            <h3>Process</h3>
                            <p>
                                AI extracts key concepts and generates high-impact questions.
                            </p>
                        </div>


                        <div className="process-card">
                            <div className="icon-box">
                                <Trophy size={32} className="text-primary" />
                            </div>
                            <h3>Master</h3>
                            <p>
                                Review and test yourself with interactive quizzes.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="benefits-section">
                    <div className="section-header">
                        <span className="section-label">BENEFITS</span>
                        <h2 className="section-title">Why Students Love QuizGenius</h2>
                    </div>

                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-icon">
                                <Clock size={28} color="white" />
                            </div>
                            <div className="benefit-content">
                                <h3>Saves Study Time</h3>
                                <p>No more manually creating Quizzes.</p>
                            </div>
                        </div>


                        <div className="benefit-card">
                            <div className="benefit-icon">
                                <Brain size={28} color="white" />
                            </div>
                            <div className="benefit-content">
                                <h3>Improves Retention</h3>
                                <p>Active recall through quizzes is proven to boost long-term memory.</p>
                            </div>
                        </div>


                        <div className="benefit-card">
                            <div className="benefit-icon">
                                <Gamepad2 size={28} color="white" />
                            </div>
                            <div className="benefit-content">
                                <h3>Makes Studying Interactive</h3>
                                <p>Gamified quizzes make learning engaging instead of boring.</p>
                            </div>
                        </div>


                        <div className="benefit-card">
                            <div className="benefit-icon">
                                <User size={28} color="white" />
                            </div>
                            <div className="benefit-content">
                                <h3>Personalized Learning</h3>
                                <p>AI adapts to your notes so every quiz is relevant to you.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="footer">
                    <div className="footer-content">
                        {/* Brand Column */}
                        <div className="footer-brand">
                            <div className="logo">
                                <div className="logo-icon">
                                    <BookOpen size={24} color="white" />
                                </div>
                                <span className="logo-text">QuizGenius</span>
                            </div>
                            <p className="footer-tagline">
                                Turn your notes into smart quizzes — powered by AI, built for students.
                            </p>
                        </div>

                        {/* Product Column */}
                        <div className="footer-links">
                            <h3>Product</h3>
                            <ul>
                                <li><a href="#">Features</a></li>
                                <li><a href="#">How It Works</a></li>
                                <li><a href="#">Testimonials</a></li>
                            </ul>
                        </div>

                        {/* Company Column */}
                        <div className="footer-links">
                            <h3>Company</h3>
                            <ul>
                                <li><a href="#">About</a></li>
                                <li><a href="#">Contact</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom"></div>
                </footer>
            </div>
        </>
    )
}

export default LandingPage;
