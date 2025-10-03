const express = require('express');
const { body, validationResult } = require('express-validator');
const { Attendance, OTP, Session, User, DeviceTracking } = require('../models');
const SecurityService = require('../services/SecurityService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Submit attendance
router.post('/submit', [
  body('rollNumber').notEmpty().withMessage('Roll number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('sessionId').isUUID().withMessage('Valid session ID required'),
  body('deviceFingerprint').notEmpty().withMessage('Device fingerprint required'),
  body('ipAddress').isIP().withMessage('Valid IP address required'),
  body('browserFingerprint').notEmpty().withMessage('Browser fingerprint required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      rollNumber,
      otp,
      sessionId,
      deviceFingerprint,
      ipAddress,
      browserFingerprint,
      geoLocation
    } = req.body;

    const io = req.app.get('io');

    // Step 1: Verify session exists and is active
    const session = await Session.findByPk(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ message: 'Session not found or inactive' });
    }

    // Step 2: Find student
    const student = await User.findOne({ where: { rollNumber, role: 'student' } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Step 3: Verify OTP
    const otpRecord = await OTP.findOne({
      where: {
        sessionId,
        studentId: student.id,
        otp,
        used: false,
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (!otpRecord) {
      await SecurityService.logSecurityIncident('failed_attempt', {
        sessionId,
        studentId: student.id,
        rollNumber,
        reason: 'Invalid or expired OTP'
      });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Step 4: Check for duplicate attendance
    const existingAttendance = await Attendance.findOne({
      where: { sessionId, studentId: student.id }
    });

    if (existingAttendance) {
      return res.status(409).json({ message: 'Attendance already marked for this session' });
    }

    // Step 5: Security analysis
    const securityData = {
      rollNumber,
      sessionId,
      studentId: student.id,
      deviceFingerprint,
      ipAddress,
      browserFingerprint,
      geoLocation,
      timestamp: Date.now()
    };

    const securityAnalysis = await SecurityService.analyzeSecurityRisk(securityData);

    if (securityAnalysis.blocked) {
      await SecurityService.logSecurityIncident('security_violation', {
        ...securityData,
        reason: securityAnalysis.reason,
        flags: securityAnalysis.flags
      }, 'high');

      // Block device/IP if score is critically low
      if (securityAnalysis.score < 30) {
        await SecurityService.blockDevice(deviceFingerprint, 'Critical security score');
        await SecurityService.blockIP(ipAddress, 'Critical security score');
      }

      return res.status(403).json({
        message: securityAnalysis.reason,
        securityScore: securityAnalysis.score,
        flags: securityAnalysis.flags
      });
    }

    // Step 6: Save attendance record
    const attendanceRecord = await Attendance.create({
      sessionId,
      studentId: student.id,
      rollNumber,
      securityScore: securityAnalysis.score,
      deviceFingerprint,
      ipAddress,
      browserFingerprint,
      geoLocation,
      securityFlags: securityAnalysis.flags,
      status: 'present'
    });

    // Step 7: Mark OTP as used
    await otpRecord.update({ used: true });

    // Step 8: Update device tracking
    await DeviceTracking.create({
      deviceFingerprint,
      studentId: student.id,
      rollNumber,
      sessionId,
      ipAddress,
      userAgent: req.headers['user-agent'] || '',
      riskScore: 100 - securityAnalysis.score
    });

    // Step 9: Real-time notification
    io.to(`session-${sessionId}`).emit('attendance-update', {
      type: 'new-attendance',
      attendance: {
        ...attendanceRecord.toJSON(),
        studentName: student.name
      }
    });

    // Step 10: Success response
    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendanceId: attendanceRecord.id,
      securityScore: securityAnalysis.score,
      timestamp: attendanceRecord.createdAt
    });

  } catch (error) {
    console.error('Attendance submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance for a session
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const attendanceRecords = await Attendance.findAll({
      where: { sessionId },
      include: [
        {
          model: User,
          attributes: ['name', 'rollNumber', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      rollNumber: record.rollNumber,
      studentName: record.User.name,
      timestamp: record.createdAt,
      status: record.status,
      securityScore: record.securityScore,
      securityFlags: record.securityFlags,
      deviceFingerprint: record.deviceFingerprint.substring(0, 10) + '...'
    }));

    res.json(formattedRecords);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Request OTP (called from mobile beacon)
router.post('/request-otp', [
  body('sessionId').isUUID().withMessage('Valid session ID required'),
  body('studentId').notEmpty().withMessage('Student ID required'),
  body('deviceFingerprint').notEmpty().withMessage('Device fingerprint required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, studentId, deviceFingerprint } = req.body;

    // Verify session
    const session = await Session.findByPk(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ message: 'Session not found or inactive' });
    }

    // Find student
    const student = await User.findOne({ where: { rollNumber: studentId, role: 'student' } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if OTP already exists and is valid
    const existingOTP = await OTP.findOne({
      where: {
        sessionId,
        studentId: student.id,
        used: false,
        expiresAt: { [require('sequelize').Op.gt]: new Date() }
      }
    });

    if (existingOTP) {
      return res.json({ otp: existingOTP.otp, expiresAt: existingOTP.expiresAt });
    }

    // Generate new OTP
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 90000); // 90 seconds

    await OTP.create({
      sessionId,
      studentId: student.id,
      otp: otpValue,
      expiresAt,
      deviceFingerprint
    });

    res.json({ otp: otpValue, expiresAt });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance history for a student
router.get('/history/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;
    
    const student = await User.findOne({ where: { rollNumber, role: 'student' } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const attendanceHistory = await Attendance.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: Session,
          attributes: ['className', 'period', 'roomNumber', 'date']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    const formattedHistory = attendanceHistory.map(record => ({
      id: record.id,
      className: record.Session.className,
      date: record.Session.date,
      timestamp: record.createdAt,
      status: record.status,
      securityScore: record.securityScore
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('Attendance history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;