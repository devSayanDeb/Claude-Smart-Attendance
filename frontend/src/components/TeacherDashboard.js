import React, { useState, useEffect } from 'react';

const TeacherDashboard = ({ user, onLogout }) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState({
    className: '',
    period: '',
    roomNumber: '',
    teacherId: user?.id || 'T001'
  });
  const [currentSession, setCurrentSession] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalExpected: 30,
    averageSecurityScore: 0,
    lastUpdated: new Date()
  });

  const [activity, setActivity] = useState([
    { id: 1, message: 'System ready for attendance', time: '10:20 PM', type: 'info' },
    { id: 2, message: 'Bluetooth beacon initialized', time: '10:19 PM', type: 'success' }
  ]);

  const handleStartSession = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sessionData,
          date: new Date().toISOString().split('T')[0],
          startTime: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentSession(result.session);
        setSessionActive(true);
        
        setActivity(prev => [{
          id: Date.now(),
          message: `Session started: ${sessionData.className}`,
          time: new Date().toLocaleTimeString(),
          type: 'success'
        }, ...prev]);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handleEndSession = () => {
    setSessionActive(false);
    setCurrentSession(null);
    setAttendanceList([]);
    
    setActivity(prev => [{
      id: Date.now(),
      message: 'Session ended',
      time: new Date().toLocaleTimeString(),
      type: 'info'
    }, ...prev]);
  };

  // Simulate receiving attendance updates
  useEffect(() => {
    if (sessionActive) {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every 5 seconds
          const studentId = `S${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`;
          const securityScore = Math.floor(Math.random() * 30) + 70; // 70-100
          
          setAttendanceList(prev => {
            if (prev.find(a => a.rollNumber === studentId)) return prev;
            
            const newAttendance = {
              id: Date.now(),
              rollNumber: studentId,
              studentName: `Student ${studentId}`,
              timestamp: new Date().toLocaleTimeString(),
              securityScore,
              status: 'present'
            };
            
            setStats(prevStats => ({
              ...prevStats,
              totalPresent: prevStats.totalPresent + 1,
              averageSecurityScore: Math.round((prevStats.averageSecurityScore * prevStats.totalPresent + securityScore) / (prevStats.totalPresent + 1)),
              lastUpdated: new Date()
            }));
            
            setActivity(prevActivity => [{
              id: Date.now(),
              message: `${studentId} marked present (Security: ${securityScore}%)`,
              time: new Date().toLocaleTimeString(),
              type: 'success'
            }, ...prevActivity.slice(0, 9)]);
            
            return [newAttendance, ...prev];
          });
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [sessionActive]);

  return (
    <div>
      <div className="header">
        <div className="header-title">
          🎓 Teacher Dashboard
        </div>
        <div className="header-user">
          <span>Welcome, {user?.name}</span>
          <button onClick={onLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="container">
        {/* Session Management Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <span className={`status-dot ${sessionActive ? 'active' : 'inactive'}`}></span>
                {sessionActive ? 'Active Session' : 'Start New Session'}
              </h2>
              <p className="card-subtitle">
                {sessionActive 
                  ? `${currentSession?.className} - Room ${currentSession?.roomNumber}` 
                  : 'Configure and start attendance session'
                }
              </p>
            </div>
            {sessionActive && (
              <button onClick={handleEndSession} className="btn btn-danger">
                <i className="fas fa-stop"></i> End Session
              </button>
            )}
          </div>

          {!sessionActive ? (
            <form onSubmit={handleStartSession}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-book"></i> Class Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Computer Science 101"
                    value={sessionData.className}
                    onChange={(e) => setSessionData({...sessionData, className: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-clock"></i> Period
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="1-8"
                    min="1"
                    max="8"
                    value={sessionData.period}
                    onChange={(e) => setSessionData({...sessionData, period: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-door-open"></i> Room Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., A101"
                    value={sessionData.roomNumber}
                    onChange={(e) => setSessionData({...sessionData, roomNumber: e.target.value})}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-large">
                <i className="fas fa-broadcast-tower"></i> Start Bluetooth Session
              </button>
            </form>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.totalPresent}</div>
                <div className="stat-label">Students Present</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.averageSecurityScore}%</div>
                <div className="stat-label">Avg Security Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{Math.round((stats.totalPresent / stats.totalExpected) * 100)}%</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance List */}
        {sessionActive && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📋 Live Attendance</h3>
              <p className="card-subtitle">Students marked present in real-time</p>
            </div>

            {attendanceList.length > 0 ? (
              <div className="activity-log">
                {attendanceList.map(record => (
                  <div key={record.id} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-check"></i>
                    </div>
                    <div className="activity-content">
                      <div className="activity-message">
                        {record.studentName} ({record.rollNumber})
                      </div>
                      <div className="activity-time">
                        {record.timestamp} • Security: {record.securityScore}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
                <p>No students have marked attendance yet</p>
                <p>Students will appear here as they connect via Bluetooth</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Log */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Activity Log</h3>
            <p className="card-subtitle">Recent system activities</p>
          </div>

          <div className="activity-log">
            {activity.map(item => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon">
                  <i className={`fas ${
                    item.type === 'success' ? 'fa-check' : 
                    item.type === 'error' ? 'fa-times' : 'fa-info'
                  }`}></i>
                </div>
                <div className="activity-content">
                  <div className="activity-message">{item.message}</div>
                  <div className="activity-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;