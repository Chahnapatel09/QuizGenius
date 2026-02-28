import { BookOpen, LogOut, Home, LogIn } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName') || 'User';
    // Get up to 2 initials
    const userInitials = userName.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2) || 'JP';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="nav-content">
                <Link to={token ? "/dashboard" : "/"} className="logo">
                    <div className="logo-icon">
                        <BookOpen size={24} color="white" />
                    </div>
                    <span className="logo-text">QuizGenius</span>
                </Link>

                {token ? (
                    <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {location.pathname !== '/dashboard' && (
                            <Link to="/dashboard" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', color: 'var(--text-gray)' }}>
                                <Home size={18} />
                                <span style={{ fontWeight: 600 }}>Home</span>
                            </Link>
                        )}
                        <button onClick={handleLogout} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', color: '#ef4444' }}>
                            <LogOut size={18} />
                            <span style={{ fontWeight: 600 }}>Logout</span>
                        </button>
                        <div className="user-profile-icon" style={{ marginLeft: '8px' }}>
                            {userInitials}
                        </div>
                    </div>
                ) : (
                    <div className="nav-actions">
                        <Link to="/login" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <LogIn size={20} />
                            Login
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
