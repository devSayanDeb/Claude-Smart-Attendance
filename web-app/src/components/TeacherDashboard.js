import React, { useState, useEffect } from 'react';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchSecurityAlerts();
    
    const interval = setInterval(() => {
      if (selectedSession) {
        fetchAttendanceData(selectedSession.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/teacher/sessions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchAttendanceData = async (sessionId) => {
    try {
      const response = await fetch(`/api/attendance/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchSecurityAlerts = async () => {
    try {
      const response = await fetch('/api/security/alerts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setSecurityAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  return (
    <div className="teacher-dashboard">
      <header className="dashboard-header">
        <h1>Smart Attendance - Teacher Portal</h1>
        <div className="header-stats">
          <div className="stat-card">
            <h3>Active Sessions</h3>
            <p>{sessions.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="stat-card alert">
            <h3>Security Alerts</h3>
            <p>{securityAlerts.length}</p>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="sessions-panel">
          <h2>Recent Sessions</h2>
          <div className="sessions-list">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <h3>{session.className}</h3>
                <p>Period: {session.period}</p>
                <p>Room: {session.roomNumber}</p>
                <span className={`status ${session.status}`}>
                  {session.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          {selectedSession ? (
            <>
              <h2>Session Details</h2>
              <div className="attendance-table">
                <table>
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Security Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map(record => (
                      <tr key={record.id}>
                        <td>{record.rollNo}</td>
                        <td>{record.studentName}</td>
                        <td>
                          <span className={`status ${record.status}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                        <td>
                          <div className={`security-score ${record.securityScore >= 80 ? 'high' : record.securityScore >= 60 ? 'medium' : 'low'}`}>
                            {record.securityScore}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>Select a session to view details</h3>
            </div>
          )}
        </div>
      </div>

      {securityAlerts.length > 0 && (
        <div className="security-alerts">
          <h2>🚨 Security Alerts</h2>
          {securityAlerts.map(alert => (
            <div key={alert.id} className="alert-card">
              <h4>{alert.type}</h4>
              <p>{alert.description}</p>
              <small>{new Date(alert.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;