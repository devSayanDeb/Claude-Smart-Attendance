import React, { useState } from 'react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import './App.css';

function App() {
  const [userType, setUserType] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleUserTypeSelect = (type) => {
    setUserType(type);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!userType) {
    return (
      <div className="user-selection">
        <div className="selection-container">
          <h1>🎓 Smart Attendance System</h1>
          <p>Select your role to continue</p>
          
          <div className="user-cards">
            <div className="user-card teacher" onClick={() => handleUserTypeSelect('teacher')}>
              <div className="card-icon">👨‍🏫</div>
              <h3>Teacher</h3>
              <p>Manage sessions and monitor attendance</p>
            </div>
            
            <div className="user-card student" onClick={() => handleUserTypeSelect('student')}>
              <div className="card-icon">👨‍🎓</div>
              <h3>Student</h3>
              <p>Mark attendance using Bluetooth</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>{userType === 'teacher' ? 'Teacher Login' : 'Student Login'}</h2>
          
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="form-group">
              <label>ID:</label>
              <input type="text" required />
            </div>
            
            <div className="form-group">
              <label>Password:</label>
              <input type="password" required />
            </div>
            
            <button type="submit" className="login-button">
              Login as {userType}
            </button>
          </form>
          
          <button 
            className="back-button" 
            onClick={() => setUserType('')}
          >
            ← Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {userType === 'teacher' ? <TeacherDashboard /> : <StudentPortal />}
    </div>
  );
}

export default App;