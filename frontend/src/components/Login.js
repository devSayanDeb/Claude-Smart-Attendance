import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [userType, setUserType] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Navigate based on user role
        if (data.user.role === 'teacher') {
          navigate('/teacher');
        } else if (data.user.role === 'student') {
          navigate('/student');
        } else {
          navigate('/security');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // For demo purposes, create a simple registration
    alert('Registration feature coming soon! Use demo credentials:\nTeacher: teacher@demo.com / password123\nStudent: student@demo.com / password123');
  };

  if (!userType) {
    return (
      <div className="login-container">
        <div className="user-selection">
          <div className="selection-header">
            <h1>🎓 Smart Attendance System</h1>
            <p>Secure attendance marking with Bluetooth proximity verification</p>
          </div>
          
          <div className="user-cards">
            <div className="user-card teacher" onClick={() => handleUserTypeSelect('teacher')}>
              <div className="card-icon">👨‍🏫</div>
              <h3>Teacher</h3>
              <p>Manage sessions and monitor attendance with real-time security analytics</p>
              <div className="card-features">
                <span>📡 Bluetooth Beacon</span>
                <span>📊 Real-time Analytics</span>
                <span>🛡️ Security Monitoring</span>
              </div>
            </div>
            
            <div className="user-card student" onClick={() => handleUserTypeSelect('student')}>
              <div className="card-icon">👨‍🎓</div>
              <h3>Student</h3>
              <p>Mark attendance using secure Bluetooth proximity detection</p>
              <div className="card-features">
                <span>📱 Mobile Friendly</span>
                <span>🔐 Secure OTP</span>
                <span>📍 Proximity Verified</span>
              </div>
            </div>
          </div>
          
          <div className="security-info">
            <h4>🔒 Security Features:</h4>
            <div className="security-features">
              <span>Bluetooth Range Enforcement</span>
              <span>Device Fingerprinting</span>
              <span>Anti-Proxy Detection</span>
              <span>Real-time Monitoring</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-container">
        <div className="login-header">
          <h2>{userType === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {userType.charAt(0).toUpperCase() + userType.slice(1)} Login</h2>
          <p>Enter your credentials to access the {userType} portal</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`Enter your ${userType} email`}
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? '🔄 Signing In...' : `Sign In as ${userType.charAt(0).toUpperCase() + userType.slice(1)}`}
          </button>
        </form>
        
        <div className="login-footer">
          <button 
            type="button"
            className="back-button" 
            onClick={() => setUserType('')}
            disabled={loading}
          >
            ← Back to Selection
          </button>
          
          <button 
            type="button"
            className="register-button"
            onClick={handleRegister}
            disabled={loading}
          >
            Need an account? Register
          </button>
        </div>
        
        <div className="demo-credentials">
          <h4>Demo Credentials:</h4>
          <p><strong>Teacher:</strong> teacher@demo.com / password123</p>
          <p><strong>Student:</strong> student@demo.com / password123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;