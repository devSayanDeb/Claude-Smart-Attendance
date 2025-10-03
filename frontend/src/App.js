import React, { useState, useEffect } from 'react';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import './style.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginType, setLoginType] = useState('student');
  const [loginForm, setLoginForm] = useState({ username: '', password: '', rollNumber: '' });
  const [isLogging, setIsLogging] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch('https://claude-smart-attendance-production.up.railway.app/api/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLogging(true);

    try {
      if (loginType === 'student') {
        if (!loginForm.rollNumber) {
          alert('Please enter your roll number');
          setIsLogging(false);
          return;
        }

        const mockStudent = {
          rollNumber: loginForm.rollNumber,
          name: `Student ${loginForm.rollNumber}`,
          type: 'student'
        };
        
        setCurrentUser(mockStudent);
        
      } else {
        if (!loginForm.username || !loginForm.password) {
          alert('Please enter both username and password');
          setIsLogging(false);
          return;
        }

        const mockTeacher = {
          employeeId: loginForm.username,
          name: `Prof. ${loginForm.username}`,
          type: 'teacher'
        };
        
        setCurrentUser(mockTeacher);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '', rollNumber: '' });
  };

  if (currentUser) {
    return currentUser.type === 'teacher' ? (
      <TeacherPortal user={currentUser} onLogout={handleLogout} />
    ) : (
      <StudentPortal user={currentUser} onLogout={handleLogout} />
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎓 Smart Attendance System</h1>
          <p>Secure, AI-powered attendance tracking with Bluetooth beacons</p>
          
          <div className="backend-status">
            {backendStatus === 'checking' && (
              <div className="status-indicator checking">
                <i className="fas fa-spinner fa-spin"></i> Connecting to server...
              </div>
            )}
            {backendStatus === 'connected' && (
              <div className="status-indicator connected">
                <i className="fas fa-check"></i> Server connected
              </div>
            )}
            {backendStatus === 'error' && (
              <div className="status-indicator error">
                <i className="fas fa-exclamation-triangle"></i> Server connection failed
              </div>
            )}
          </div>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${loginType === 'student' ? 'active' : ''}`}
            onClick={() => setLoginType('student')}
          >
            👨‍🎓 Student Login
          </button>
          <button
            className={`tab ${loginType === 'teacher' ? 'active' : ''}`}
            onClick={() => setLoginType('teacher')}
          >
            👨‍🏫 Teacher Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {loginType === 'student' ? (
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-input"
                value={loginForm.rollNumber}
                onChange={(e) => setLoginForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                placeholder="Enter your roll number (e.g., 2021CS001)"
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter your employee ID"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isLogging || backendStatus === 'error'}
          >
            {isLogging ? (
              <><i className="fas fa-spinner fa-spin"></i> Logging in...</>
            ) : (
              <><i className="fas fa-sign-in-alt"></i> Login</>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="security-features">
            <h4>🔒 Security Features</h4>
            <div className="features-grid">
              <div className="feature">
                <i className="fas fa-fingerprint"></i>
                <span>Device Fingerprinting</span>
              </div>
              <div className="feature">
                <i className="fas fa-key"></i>
                <span>OTP Verification</span>
              </div>
              <div className="feature">
                <i className="fas fa-shield-alt"></i>
                <span>Anti-Spoofing</span>
              </div>
              <div className="feature">
                <i className="fas fa-clock"></i>
                <span>Time-based Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;