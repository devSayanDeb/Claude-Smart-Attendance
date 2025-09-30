import React, { useState, useEffect } from 'react';
import './StudentPortal.css';

const StudentPortal = () => {
  const [rollNumber, setRollNumber] = useState('');
  const [otp, setOTP] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [foundBeacon, setFoundBeacon] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [status, setStatus] = useState('');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  useEffect(() => {
    generateDeviceFingerprint();
  }, []);

  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [timeRemaining]);

  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = {
      canvas: canvas.toDataURL(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now()
    };
    
    setDeviceFingerprint(btoa(JSON.stringify(fingerprint)));
  };

  const scanForBeacon = async () => {
    setIsScanning(true);
    setStatus('Scanning for beacon...');
    
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['12345678-1234-1234-1234-123456789abc'] }]
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('12345678-1234-1234-1234-123456789abc');
      
      const characteristic = await service.getCharacteristic('12345678-1234-1234-1234-123456789abd');
      const value = await characteristic.readValue();
      
      const beaconData = JSON.parse(new TextDecoder().decode(value));
      setFoundBeacon(beaconData);
      
      await requestOTP(beaconData.sessionId);
      
      setTimeRemaining(90);
      setStatus('Beacon found! Enter your details within 90 seconds.');
      
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const requestOTP = async (sessionId) => {
    try {
      const response = await fetch('/api/student/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentId: rollNumber,
          deviceFingerprint
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOTP(data.otp);
      }
    } catch (error) {
      console.error('OTP request error:', error);
    }
  };

  const submitAttendance = async () => {
    try {
      setStatus('Submitting attendance...');
      
      const attendanceData = {
        rollNumber,
        otp,
        sessionId: foundBeacon.sessionId,
        deviceFingerprint,
        ipAddress: await fetch('/api/get-ip').then(r => r.text()),
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        browserFingerprint: deviceFingerprint
      };

      const response = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });

      const result = await response.json();
      
      if (response.ok) {
        setStatus('✅ Attendance marked successfully!');
      } else {
        setStatus(`❌ Error: ${result.message}`);
      }
      
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="student-portal">
      <header className="portal-header">
        <h1>Smart Attendance - Student</h1>
      </header>

      <div className="attendance-form">
        <div className="step">
          <h2>Step 1: Scan for Beacon</h2>
          <button 
            onClick={scanForBeacon} 
            disabled={isScanning}
            className="scan-button"
          >
            {isScanning ? 'Scanning...' : 'Scan for Teacher Beacon'}
          </button>
        </div>

        {foundBeacon && (
          <div className="step">
            <h2>Step 2: Mark Attendance</h2>
            <div className="beacon-info">
              <p>📍 Found: {foundBeacon.className}</p>
              <p>⏰ Time remaining: {timeRemaining}s</p>
            </div>
            
            <input
              type="text"
              placeholder="Roll Number"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="input-field"
            />
            
            <input
              type="text"
              placeholder="OTP (received via Bluetooth)"
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
              className="input-field"
              readOnly
            />
            
            <button 
              onClick={submitAttendance}
              disabled={!rollNumber || !otp || timeRemaining <= 0}
              className="submit-button"
            >
              Submit Attendance
            </button>
          </div>
        )}

        <div className="status-display">
          <p className={status.includes('✅') ? 'success' : status.includes('❌') ? 'error' : 'info'}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;