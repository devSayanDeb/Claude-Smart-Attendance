import React, { useState, useEffect } from 'react';
import TeacherDashboard from './components/TeacherDashboard';
import StudentPortal from './components/StudentPortal';
import Login from './components/Login';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setCurrentView(userData.role === 'teacher' ? 'teacher' : 'student');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setCurrentView(userData.role === 'teacher' ? 'teacher' : 'student');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setCurrentView('login');
  };

  return (
    <div className="app">
      {currentView === 'login' && (
        <Login onLogin={handleLogin} />
      )}
      
      {currentView === 'teacher' && (
        <TeacherDashboard user={user} onLogout={handleLogout} />
      )}
      
      {currentView === 'student' && (
        <StudentPortal user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;