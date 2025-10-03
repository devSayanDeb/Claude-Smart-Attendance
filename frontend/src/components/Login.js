import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rollNumber: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Demo login - in real app, this would call an API
    const userData = {
      id: role === 'teacher' ? 'T001' : 'S001',
      name: role === 'teacher' ? 'Dr. Smith' : formData.rollNumber,
      role: role,
      email: formData.email || `${role}@demo.com`,
      rollNumber: role === 'student' ? formData.rollNumber : null
    };
    
    onLogin(userData);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">
          <h1>🎓 Smart Attendance</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Secure attendance with Bluetooth verification
          </p>
        </div>

        <div className="role-selector">
          <button
            type="button"
            className={`role-btn ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            👨‍🎓 Student
          </button>
          <button
            type="button"
            className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            👨‍🏫 Teacher
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {role === 'student' && (
            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your roll number"
                value={formData.rollNumber}
                onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder={`${role}@example.com`}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password (demo: any)"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%' }}>
            <i className="fas fa-sign-in-alt"></i>
            Login as {role === 'teacher' ? 'Teacher' : 'Student'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;