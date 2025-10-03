const express = require('express');
const { body, validationResult } = require('express-validator');
const { Session, User, Attendance } = require('../models');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create new session
router.post('/', [
  body('className').notEmpty().withMessage('Class name is required'),
  body('period').isInt({ min: 1, max: 10 }).withMessage('Period must be between 1-10'),
  body('roomNumber').notEmpty().withMessage('Room number is required'),
  body('teacherId').notEmpty().withMessage('Teacher ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { className, period, roomNumber, teacherId, date, startTime } = req.body;

    // Find teacher
    const teacher = await User.findOne({ where: { rollNumber: teacherId, role: 'teacher' } });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Create session
    const session = await Session.create({
      teacherId: teacher.id,
      className,
      period: parseInt(period),
      roomNumber,
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || new Date(),
      status: 'active'
    });

    const io = req.app.get('io');
    io.emit('session-created', {
      sessionId: session.id,
      className,
      teacherName: teacher.name
    });

    res.status(201).json({
      success: true,
      sessionId: session.id,
      session: {
        id: session.id,
        className: session.className,
        period: session.period,
        roomNumber: session.roomNumber,
        startTime: session.startTime,
        status: session.status
      }
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all sessions (for teachers)
router.get('/', async (req, res) => {
  try {
    const { teacherId, status, date } = req.query;
    
    let whereClause = {};
    
    if (teacherId) {
      const teacher = await User.findOne({ where: { rollNumber: teacherId, role: 'teacher' } });
      if (teacher) {
        whereClause.teacherId = teacher.id;
      }
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (date) {
      whereClause.date = date;
    }

    const sessions = await Session.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['name', 'rollNumber']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      className: session.className,
      period: session.period,
      roomNumber: session.roomNumber,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      teacherName: session.User.name,
      teacherId: session.User.rollNumber
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get specific session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          attributes: ['name', 'rollNumber']
        },
        {
          model: Attendance,
          include: [
            {
              model: User,
              attributes: ['name', 'rollNumber']
            }
          ]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const sessionData = {
      id: session.id,
      className: session.className,
      period: session.period,
      roomNumber: session.roomNumber,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      teacher: {
        name: session.User.name,
        rollNumber: session.User.rollNumber
      },
      attendance: session.Attendances.map(att => ({
        id: att.id,
        student: {
          name: att.User.name,
          rollNumber: att.User.rollNumber
        },
        timestamp: att.createdAt,
        status: att.status,
        securityScore: att.securityScore
      }))
    };

    res.json(sessionData);
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update session status
router.put('/:sessionId/status', [
  body('status').isIn(['active', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.params;
    const { status } = req.body;

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await session.update({
      status,
      ...(status === 'completed' && { endTime: new Date() })
    });

    const io = req.app.get('io');
    io.to(`session-${sessionId}`).emit('session-status-updated', {
      sessionId,
      status,
      endTime: session.endTime
    });

    res.json({
      success: true,
      message: `Session ${status}`,
      session: {
        id: session.id,
        status: session.status,
        endTime: session.endTime
      }
    });
  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get session statistics
router.get('/:sessionId/stats', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const attendanceStats = await Attendance.findAll({
      where: { sessionId },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalPresent'],
        [require('sequelize').fn('AVG', require('sequelize').col('securityScore')), 'avgSecurityScore'],
        [require('sequelize').fn('MIN', require('sequelize').col('securityScore')), 'minSecurityScore'],
        [require('sequelize').fn('MAX', require('sequelize').col('securityScore')), 'maxSecurityScore']
      ],
      raw: true
    });

    const stats = {
      sessionId,
      className: session.className,
      totalPresent: parseInt(attendanceStats[0].totalPresent) || 0,
      averageSecurityScore: Math.round(parseFloat(attendanceStats[0].avgSecurityScore) || 0),
      minSecurityScore: parseInt(attendanceStats[0].minSecurityScore) || 0,
      maxSecurityScore: parseInt(attendanceStats[0].maxSecurityScore) || 0,
      sessionDuration: session.endTime 
        ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000) 
        : Math.round((new Date() - new Date(session.startTime)) / 60000)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;