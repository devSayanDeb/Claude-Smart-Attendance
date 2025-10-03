import React, { useState, useEffect } from 'react';

const StudentPortal = ({ user, onLogout }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [foundBeacon, setFoundBeacon] = useState(null);
  const [otp, setOTP] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [status, setStatus] = useState('Ready to scan for teacher beacon');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Generate device fingerprint on load
  useEffect(() => {
    generateDeviceFingerprint();
    fetchAttendanceHistory();
  }, []);

  // Timer for OTP expiration
  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
    } else if (timeRemaining === 0 && foundBeacon) {
      setStatus('⏰ OTP expired! Please scan again.');
      resetScanState();
    }
    return () => clearTimeout(timer);
  }, [timeRemaining, foundBeacon]);

  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Smart Attendance Fingerprint', 2, 2);
    
    const fingerprint = {
      canvas: canvas.toDataURL(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now()
    };
    
    setDeviceFingerprint(btoa(JSON.stringify(fingerprint)));
  };

  const fetchAttendanceHistory = async () => {
    if (!user?.rollNumber) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/attendance/history/${user.rollNumber}`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceHistory(data);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const resetScanState = () => {
    setFoundBeacon(null);
    setOTP('');
    setTimeRemaining(0);
    setIsSubmitting(false);
  };

  const scanForBeacon = async () => {
    if (!user?.rollNumber) {
      setStatus('❌ Please log in with your roll number');
      return;
    }

    setIsScanning(true);
    setStatus('🔍 Scanning for teacher beacon...');
    resetScanState();

    try {
      // First, check if there are any active sessions
      const sessionsResponse = await fetch('http://localhost:3000/api/sessions');
      
      if (!sessionsResponse.ok) {
        setStatus('❌ No active sessions found. Teacher must start a session first.');
        setIsScanning(false);
        return;
      }

      const allSessions = await sessionsResponse.json();
      const activeSessions = allSessions.filter(session => session.status === 'active');
      
      if (activeSessions.length === 0) {
        setStatus('❌ No active sessions found. Teacher must start a session first.');
        setIsScanning(false);
        return;
      }

      // Simulate beacon discovery process
      setTimeout(async () => {
        try {
          // Use the first active session
          const selectedSession = activeSessions[0];
          
          setFoundBeacon(selectedSession);
          setStatus('📡 Beacon found! Requesting OTP...');

          // Request OTP from backend
          const otpResponse = await fetch('http://localhost:3000/api/attendance/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: selectedSession.id,
              studentId: user.rollNumber,
              deviceFingerprint: deviceFingerprint
            })
          });

          if (otpResponse.ok) {
            const otpData = await otpResponse.json();
            setOTP(otpData.otp);
            
            // Calculate remaining time from server response
            const expiryTime = new Date(otpData.expiresAt).getTime();
            const currentTime = Date.now();
            const remainingSeconds = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
            
            setTimeRemaining(remainingSeconds);
            setStatus(`✅ OTP received! Submit within ${remainingSeconds} seconds.`);
          } else {
            const errorData = await otpResponse.json();
            setStatus(`❌ OTP Error: ${errorData.message}`);
            resetScanState();
          }
        } catch (error) {
          console.error('Beacon scanning error:', error);
          setStatus('❌ Error connecting to beacon. Check network connection.');
          resetScanState();
        } finally {
          setIsScanning(false);
        }
      }, 2000); // 2 second scanning simulation

    } catch (error) {
      console.error('Scanning error:', error);
      setStatus('❌ Network error. Please check connection.');
      setIsScanning(false);
    }
  };

  const submitAttendance = async () => {
    if (!otp || !foundBeacon || timeRemaining <= 0) {
      setStatus('❌ Invalid submission. Please scan again.');
      return;
    }

    setIsSubmitting(true);
    setStatus('📤 Submitting attendance...');

    try {
      const response = await fetch('http://localhost:3000/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: user.rollNumber,
          otp: otp,
          sessionId: foundBeacon.id,
          deviceFingerprint: deviceFingerprint,
          ipAddress: await getClientIP(),
          browserFingerprint: deviceFingerprint
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStatus(`✅ Success! Attendance marked (Security Score: ${result.securityScore}%)`);
        
        // Add to history
        const newRecord = {
          id: result.attendanceId,
          className: foundBeacon.className,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          status: 'present',
          securityScore: result.securityScore
        };
        setAttendanceHistory(prev => [newRecord, ...prev]);
        
        // Reset state after successful submission
        setTimeout(() => {
          resetScanState();
          setStatus('Ready to scan for next session');
        }, 3000);
        
      } else {
        setStatus(`❌ Error: ${result.message}`);
        if (result.securityScore) {
          setTimeout(() => {
            setStatus(`❌ ${result.message} (Security Score: ${result.securityScore}%)`);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setStatus(`❌ Network Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/get-ip');
      return await response.text();
    } catch {
      return 'unknown';
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
            <p className="card-subtitle">
              Scan for teacher's Bluetooth beacon to mark attendance securely
            </p>
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
                  <><i className="fas fa-search"></i> Scan for Teacher Beacon</>
                )}
              </button>
            ) : (
              <div>
                <div className="success-message">
                  <div style={{ marginBottom: '10px' }}>
                    <strong>📚 {foundBeacon.className}</strong><br/>
                    📍 Room {foundBeacon.roomNumber} • Period {foundBeacon.period}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: timeRemaining <= 10 ? 'var(--error)' : 'var(--success)' }}>
                    ⏰ Time remaining: {timeRemaining}s
                  </div>
                </div>

                {/* OTP Display Section */}
                {otp && (
                  <div className="form-group" style={{ maxWidth: '200px', margin: '0 auto 1rem' }}>
                    <label className="form-label">OTP Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={otp}
                      readOnly
                      style={{ 
                        textAlign: 'center', 
                        fontWeight: 'bold', 
                        fontSize: '20px',
                        letterSpacing: '2px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--accent)',
                        border: '2px solid var(--accent)'
                      }}
                    />
                  </div>
                )}

                {/* Submit Button */}
                {otp && (
                  <button
                    onClick={submitAttendance}
                    disabled={!otp || timeRemaining <= 0 || isSubmitting}
                    className="btn btn-success btn-large"
                  >
                    {isSubmitting ? (
                      <><i className="fas fa-spinner fa-spin"></i> Submitting...</>
                    ) : (
                      <><i className="fas fa-check"></i> Submit Attendance</>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Status Display */}
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius)',
              textAlign: 'center',
              border: `1px solid ${
                status.includes('✅') ? 'var(--success)' : 
                status.includes('❌') ? 'var(--error)' : 
                status.includes('⚠️') ? 'var(--warning)' : 'var(--border)'
              }`
            }}>
              <div style={{ 
                color: status.includes('✅') ? 'var(--success)' : 
                       status.includes('❌') ? 'var(--error)' : 
                       status.includes('⚠️') ? 'var(--warning)' : 'var(--text-primary)',
                fontWeight: '500'
              }}>
                {status}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Your Attendance History</h3>
            <p className="card-subtitle">Recent attendance records for {user?.rollNumber}</p>
          </div>

          {attendanceHistory.length > 0 ? (
            <div className="activity-log">
              {attendanceHistory.slice(0, 10).map(record => (
                <div key={record.id} className="activity-item">
                  <div className="activity-icon">
                    <i className="fas fa-check"></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-message">
                      {record.className || 'Class Session'}
                    </div>
                    <div className="activity-time">
                      {new Date(record.date).toLocaleDateString()} • 
                      Security Score: {record.securityScore}% • 
                      Status: {record.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <i className="fas fa-history" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
              <h3>No Attendance Records</h3>
              <p>Mark your first attendance to see history here</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 How to Mark Attendance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
            <div>
              <h4>1. 📡 Scan for Beacon</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Make sure you're within 30 feet of your teacher's device and click scan
              </p>
            </div>
            <div>
              <h4>2. 🔑 Receive OTP</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                OTP will be automatically received and displayed on your screen
              </p>
            </div>
            <div>
              <h4>3. ⏰ Submit Quickly</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Submit attendance within 90 seconds before the OTP expires
              </p>
            </div>
            <div>
              <h4>4. ✅ Get Confirmation</h4>
              <p style={{ color: 'var(--text-secondary)' }}>
                Receive confirmation with your security score and attendance status
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;