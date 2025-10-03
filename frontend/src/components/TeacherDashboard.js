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
    totalExpected: 0,
    averageSecurityScore: 0,
    lastUpdated: new Date()
  });
  const [activity, setActivity] = useState([
    { id: 1, message: 'System initialized and ready', time: new Date().toLocaleTimeString(), type: 'info' }
  ]);

  const addActivity = (message, type = 'info') => {
    setActivity(prev => [{
      id: Date.now(),
      message,
      time: new Date().toLocaleTimeString(),
      type
    }, ...prev.slice(0, 9)]);
  };

  const updateStats = (newAttendance) => {
    setStats(prev => {
      const newTotal = prev.totalPresent + 1;
      const newAvgScore = Math.round(
        ((prev.averageSecurityScore * prev.totalPresent) + newAttendance.securityScore) / newTotal
      );
      
      return {
        ...prev,
        totalPresent: newTotal,
        averageSecurityScore: newAvgScore,
        lastUpdated: new Date()
      };
    });
  };

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
        setAttendanceList([]); // Clear previous attendance
        setStats({
          totalPresent: 0,
          totalExpected: 0,
          averageSecurityScore: 0,
          lastUpdated: new Date()
        });
        
        addActivity(`Session started: ${sessionData.className} in Room ${sessionData.roomNumber}`, 'success');
        
        // Start polling for attendance updates
        startAttendancePolling(result.session.id);
      } else {
        addActivity('Failed to start session', 'error');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      addActivity('Network error - could not start session', 'error');
    }
  };

  const startAttendancePolling = (sessionId) => {
    const interval = setInterval(async () => {
      if (!sessionActive) {
        clearInterval(interval);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:3000/api/attendance/session/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Check for new attendance records
          const newRecords = data.filter(record => 
            !attendanceList.find(existing => existing.id === record.id)
          );
          
          if (newRecords.length > 0) {
            setAttendanceList(data);
            
            // Update stats
            if (data.length > 0) {
              const avgScore = Math.round(
                data.reduce((sum, a) => sum + a.securityScore, 0) / data.length
              );
              setStats(prev => ({
                ...prev,
                totalPresent: data.length,
                averageSecurityScore: avgScore,
                lastUpdated: new Date()
              }));
            }
            
            // Add activity for new records
            newRecords.forEach(record => {
              addActivity(
                `${record.rollNumber} marked present (Security: ${record.securityScore}%)`, 
                'success'
              );
            });
          }
        }
      } catch (error) {
        console.error('Error polling attendance:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    return interval;
  };

  const handleEndSession = () => {
    setSessionActive(false);
    setCurrentSession(null);
    setAttendanceList([]);
    
    addActivity('Session ended by teacher', 'info');
  };

  const fetchSessionAttendance = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/session/${currentSession.id}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceList(data);
        
        // Update stats based on fetched data
        if (data.length > 0) {
          const avgScore = Math.round(
            data.reduce((sum, a) => sum + a.securityScore, 0) / data.length
          );
          setStats(prev => ({
            ...prev,
            totalPresent: data.length,
            averageSecurityScore: avgScore,
            lastUpdated: new Date()
          }));
        }
        
        addActivity('Attendance data refreshed', 'info');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      addActivity('Failed to fetch attendance data', 'error');
    }
  };

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
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={fetchSessionAttendance} className="btn btn-secondary">
                  <i className="fas fa-sync"></i> Refresh
                </button>
                <button onClick={handleEndSession} className="btn btn-danger">
                  <i className="fas fa-stop"></i> End Session
                </button>
              </div>
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
                <div className="stat-value">{stats.averageSecurityScore || 0}%</div>
                <div className="stat-label">Avg Security Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {stats.totalExpected > 0 ? Math.round((stats.totalPresent / stats.totalExpected) * 100) : 0}%
                </div>
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
              <p className="card-subtitle">
                Real-time attendance submissions - {attendanceList.length} students marked
              </p>
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
                        {record.studentName || `Student ${record.rollNumber}`} ({record.rollNumber})
                      </div>
                      <div className="activity-time">
                        {new Date(record.timestamp).toLocaleTimeString()} • Security: {record.securityScore}%
                        {record.securityFlags && record.securityFlags.length > 0 && (
                          <span style={{ color: 'var(--warning)', marginLeft: '10px' }}>
                            ⚠️ {record.securityFlags.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
                <h3>Waiting for Students</h3>
                <p>Students will appear here as they mark attendance via Bluetooth</p>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                  <p><strong>📱 For Students:</strong> Use the student portal to scan for this beacon</p>
                  <p><strong>🔗 Session ID:</strong> {currentSession?.id?.substring(0, 8)}...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Log */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 System Activity</h3>
            <p className="card-subtitle">Recent system events and notifications</p>
          </div>

          <div className="activity-log">
            {activity.map(item => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon" style={{ 
                  backgroundColor: 
                    item.type === 'success' ? 'var(--success)' : 
                    item.type === 'error' ? 'var(--error)' : 
                    item.type === 'warning' ? 'var(--warning)' : 'var(--accent)' 
                }}>
                  <i className={`fas ${
                    item.type === 'success' ? 'fa-check' : 
                    item.type === 'error' ? 'fa-times' : 
                    item.type === 'warning' ? 'fa-exclamation' : 'fa-info'
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