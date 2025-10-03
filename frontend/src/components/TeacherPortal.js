import React, { useState, useEffect } from 'react';

const TeacherPortal = ({ user, onLogout }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    className: '',
    roomNumber: '',
    period: '',
    duration: 30
  });

  useEffect(() => {
    fetchSessions();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (currentSession) {
      const interval = setInterval(() => {
        fetchCurrentAttendance();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentSession]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('https://claude-smart-attendance-production.up.railway.app/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        const activeSession = data.find(session => session.status === 'active');
        if (activeSession) {
          setCurrentSession(activeSession);
          fetchCurrentAttendance();
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchCurrentAttendance = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`https://claude-smart-attendance-production.up.railway.app/api/attendance/${currentSession.id}`);
      if (response.ok) {
        const data = await response.json();
        setAttendance(data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('https://claude-smart-attendance-production.up.railway.app/api/analytics/summary');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    if (!newSession.className || !newSession.roomNumber || !newSession.period) {
      alert('Please fill all required fields');
      return;
    }

    setIsCreatingSession(true);
    
    try {
      const response = await fetch('https://claude-smart-attendance-production.up.railway.app/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSession,
          teacherId: user.employeeId || user.id,
          teacherName: user.name
        })
      });

      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session);
        setSessions(prev => [session, ...prev]);
        setNewSession({ className: '', roomNumber: '', period: '', duration: 30 });
        alert(`✅ Session "${session.className}" started successfully!`);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      alert('❌ Network error - could not start session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;
    
    try {
      const response = await fetch(`https://claude-smart-attendance-production.up.railway.app/api/sessions/${currentSession.id}/end`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setCurrentSession(null);
        setAttendance([]);
        fetchSessions();
        alert('✅ Session ended successfully!');
      } else {
        alert('❌ Error ending session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      alert('❌ Network error - could not end session');
    }
  };

  const exportAttendance = async () => {
    if (!currentSession || attendance.length === 0) {
      alert('No attendance data to export');
      return;
    }

    try {
      const response = await fetch(`https://claude-smart-attendance-production.up.railway.app/api/attendance/${currentSession.id}/export`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${currentSession.className}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Error exporting data');
    }
  };

  return (
    <div>
      <div className="header">
        <div className="header-title">
          👨‍🏫 Teacher Dashboard
        </div>
        <div className="header-user">
          <span>Welcome, {user?.name}</span>
          <button onClick={onLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="container">
        {!currentSession ? (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📚 Create New Session</h2>
              <p className="card-subtitle">Start a new attendance session for your class</p>
            </div>

            <form onSubmit={createSession} className="session-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Class Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSession.className}
                    onChange={(e) => setNewSession(prev => ({ ...prev, className: e.target.value }))}
                    placeholder="e.g., Computer Science 101"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Room Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSession.roomNumber}
                    onChange={(e) => setNewSession(prev => ({ ...prev, roomNumber: e.target.value }))}
                    placeholder="e.g., 201A"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Period *</label>
                  <select
                    className="form-input"
                    value={newSession.period}
                    onChange={(e) => setNewSession(prev => ({ ...prev, period: e.target.value }))}
                    required
                  >
                    <option value="">Select Period</option>
                    <option value="1">Period 1</option>
                    <option value="2">Period 2</option>
                    <option value="3">Period 3</option>
                    <option value="4">Period 4</option>
                    <option value="5">Period 5</option>
                    <option value="6">Period 6</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSession.duration}
                    onChange={(e) => setNewSession(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="5"
                    max="120"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingSession}
                className="btn btn-primary btn-large"
              >
                {isCreatingSession ? (
                  <><i className="fas fa-spinner fa-spin"></i> Starting Session...</>
                ) : (
                  <><i className="fas fa-play"></i> Start Session</>  
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📡 Active Session</h3>
                <p className="card-subtitle">Bluetooth beacon is broadcasting for attendance</p>
              </div>

              <div className="session-info">
                <div className="session-detail">
                  <h4>📚 {currentSession.className}</h4>
                  <p>📍 Room {currentSession.roomNumber} • Period {currentSession.period}</p>
                </div>

                <div className="session-stats">
                  <div className="stat">
                    <span className="stat-value">{attendance.length}</span>
                    <span className="stat-label">Students Present</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {new Date(currentSession.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="stat-label">Started At</span>
                  </div>
                </div>

                <div className="session-actions">
                  <button
                    onClick={exportAttendance}
                    className="btn btn-outline"
                    disabled={attendance.length === 0}
                  >
                    <i className="fas fa-download"></i> Export CSV
                  </button>
                  <button
                    onClick={endSession}
                    className="btn btn-danger"
                  >
                    <i className="fas fa-stop"></i> End Session
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">👥 Live Attendance ({attendance.length})</h3>
                <p className="card-subtitle">Students who have marked attendance</p>
              </div>

              {attendance.length > 0 ? (
                <div className="attendance-list">
                  {attendance.map(record => (
                    <div key={record.id} className="attendance-item">
                      <div className="attendance-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="attendance-info">
                        <div className="attendance-name">{record.rollNumber}</div>
                        <div className="attendance-time">
                          {new Date(record.timestamp).toLocaleTimeString()} • 
                          Security Score: {record.securityScore}%
                        </div>
                      </div>
                      <div className="attendance-status">
                        <i className="fas fa-check"></i>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
                  <h3>No Attendance Yet</h3>
                  <p>Students will appear here as they mark attendance</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid-3">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{analytics.total}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-check"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{analytics.present}</div>
              <div className="stat-label">Present Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{analytics.percentage}%</div>
              <div className="stat-label">Attendance Rate</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Recent Sessions</h3>
            <p className="card-subtitle">Your recent attendance sessions</p>
          </div>

          {sessions.length > 0 ? (
            <div className="sessions-list">
              {sessions.slice(0, 5).map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-icon">
                    <i className={`fas ${session.status === 'active' ? 'fa-play' : 'fa-stop'}`}></i>
                  </div>
                  <div className="session-content">
                    <div className="session-title">{session.className}</div>
                    <div className="session-details">
                      Room {session.roomNumber} • Period {session.period} • 
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="session-status">
                    <span className={`status ${session.status === 'active' ? 'active' : 'completed'}`}>
                      {session.status === 'active' ? 'Active' : 'Completed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <i className="fas fa-calendar" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
              <h3>No Sessions Yet</h3>
              <p>Create your first attendance session to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherPortal;