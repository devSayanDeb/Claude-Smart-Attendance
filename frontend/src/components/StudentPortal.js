import React, { useState, useEffect } from 'react';

const StudentPortal = ({ user, onLogout }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [foundBeacon, setFoundBeacon] = useState(null);
  const [otp, setOTP] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [status, setStatus] = useState('Ready to scan for teacher beacon');
  const [attendanceHistory, setAttendanceHistory] = useState([
    { id: 1, className: 'Computer Science 101', date: '2025-10-02', status: 'present', securityScore: 95 },
    { id: 2, className: 'Mathematics', date: '2025-10-01', status: 'present', securityScore: 88 },
    { id: 3, className: 'Physics Lab', date: '2025-09-30', status: 'present', securityScore: 92 }
  ]);

  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
    } else if (timeRemaining === 0 && foundBeacon) {
      setStatus('⏰ Time expired! Please scan again.');
      setFoundBeacon(null);
      setOTP('');
    }
    return () => clearTimeout(timer);
  }, [timeRemaining, foundBeacon]);

  const scanForBeacon = async () => {
    setIsScanning(true);
    setStatus('🔍 Scanning for teacher beacon...');

    // Simulate scanning process
    setTimeout(async () => {
      try {
        // Simulate finding a beacon
        const mockBeacon = {
          sessionId: `session_${Date.now()}`,
          className: 'Computer Science 101',
          roomNumber: 'A101',
          period: 3
        };

        setFoundBeacon(mockBeacon);
        setStatus('📡 Beacon found! Requesting OTP...');

        // Request OTP
        const response = await fetch('http://localhost:3000/api/attendance/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: mockBeacon.sessionId,
            studentId: user.rollNumber,
            deviceFingerprint: `demo_${Date.now()}`
          })
        });

        if (response.ok) {
          const data = await response.json();
          setOTP(data.otp);
          setTimeRemaining(90);
          setStatus('✅ OTP received! Submit within 90 seconds.');
        }
      } catch (error) {
        setStatus('❌ Error connecting to beacon. Try again.');
      } finally {
        setIsScanning(false);
      }
    }, 3000);
  };

  const submitAttendance = async () => {
    if (!otp || !foundBeacon) return;

    setStatus('📤 Submitting attendance...');

    try {
      const response = await fetch('http://localhost:3000/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: user.rollNumber,
          otp: otp,
          sessionId: foundBeacon.sessionId,
          deviceFingerprint: `demo_${Date.now()}`,
          ipAddress: '127.0.0.1',
          browserFingerprint: `browser_${Date.now()}`
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`✅ Success! Attendance marked (Security Score: ${result.securityScore}%)`);
        setTimeRemaining(0);
        setFoundBeacon(null);
        setOTP('');

        // Add to history
        setAttendanceHistory(prev => [{
          id: Date.now(),
          className: foundBeacon.className,
          date: new Date().toISOString().split('T')[0],
          status: 'present',
          securityScore: result.securityScore
        }, ...prev]);
      } else {
        setStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setStatus(`❌ Network error: ${error.message}`);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="header-title">
          🎓 Student Portal
        </div>
        <div className="header-user">
          <span>Welcome, {user?.rollNumber}</span>
          <button onClick={onLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="container">
        {/* Attendance Scanner */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📱 Mark Attendance</h2>
            <p className="card-subtitle">Scan for teacher's Bluetooth beacon to mark attendance</p>
          </div>

          <div className="bluetooth-scanner">
            <div className={`scan-circle ${isScanning ? 'scanning' : ''}`}>
              {isScanning ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : foundBeacon ? (
                <i className="fas fa-check"></i>
              ) : (
                <i className="fas fa-bluetooth"></i>
              )}
            </div>

            {!foundBeacon ? (
              <button 
                onClick={scanForBeacon} 
                disabled={isScanning}
                className="btn btn-primary btn-large"
              >
                {isScanning ? (
                  <><i className="fas fa-spinner fa-spin"></i> Scanning...</>
                ) : (
                  <><i className="fas fa-search"></i> Scan for Beacon</>
                )}
              </button>
            ) : (
              <div>
                <div className="success-message">
                  <strong>📚 {foundBeacon.className}</strong><br/>
                  📍 Room {foundBeacon.roomNumber} • Period {foundBeacon.period}<br/>
                  ⏰ Time remaining: <strong>{timeRemaining}s</strong>
                </div>

                <div className="form-group" style={{ maxWidth: '200px', margin: '0 auto 1rem' }}>
                  <label className="form-label">OTP Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={otp}
                    readOnly
                    style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}
                  />
                </div>

                <button
                  onClick={submitAttendance}
                  disabled={!otp || timeRemaining <= 0}
                  className="btn btn-success btn-large"
                >
                  <i className="fas fa-check"></i> Submit Attendance
                </button>
              </div>
            )}

            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius)',
              textAlign: 'center'
            }}>
              <div style={{ color: status.includes('✅') ? 'var(--success)' : status.includes('❌') ? 'var(--error)' : 'var(--text-secondary)' }}>
                {status}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Your Attendance History</h3>
            <p className="card-subtitle">Recent attendance records</p>
          </div>

          <div className="activity-log">
            {attendanceHistory.map(record => (
              <div key={record.id} className="activity-item">
                <div className="activity-icon">
                  <i className="fas fa-check"></i>
                </div>
                <div className="activity-content">
                  <div className="activity-message">
                    {record.className}
                  </div>
                  <div className="activity-time">
                    {record.date} • Security Score: {record.securityScore}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 How to Mark Attendance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <h4>1. 📡 Scan</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Click scan button and make sure you're within 30 feet of teacher</p>
            </div>
            <div>
              <h4>2. 🔑 Get OTP</h4>
              <p style={{ color: 'var(--text-secondary)' }}>OTP will be received automatically via Bluetooth</p>
            </div>
            <div>
              <h4>3. ⏰ Submit Quick</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Submit within 90 seconds before OTP expires</p>
            </div>
            <div>
              <h4>4. ✅ Confirmed</h4>
              <p style={{ color: 'var(--text-secondary)' }}>Get confirmation with security score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;