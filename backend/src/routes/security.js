const express = require('express');
const { SecurityLog, DeviceTracking, Attendance } = require('../models');
const SecurityService = require('../services/SecurityService');
const { Op } = require('sequelize');

const router = express.Router();

// Get security alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 20, severity, type, resolved } = req.query;
    
    let whereClause = {};
    
    if (severity) {
      whereClause.severity = severity;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (resolved !== undefined) {
      whereClause.resolved = resolved === 'true';
    }

    const alerts = await SecurityLog.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      description: alert.reason,
      severity: alert.severity,
      timestamp: alert.createdAt,
      rollNumber: alert.rollNumber,
      sessionId: alert.sessionId,
      resolved: alert.resolved,
      data: alert.data
    }));

    res.json(formattedAlerts);
  } catch (error) {
    console.error('Get security alerts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get security metrics
router.get('/metrics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    // Calculate time range
    let timeRange;
    switch (timeframe) {
      case '1h':
        timeRange = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeRange = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get total attempts
    const totalAttempts = await Attendance.count({
      where: {
        createdAt: { [Op.gte]: timeRange }
      }
    });

    // Get successful attempts
    const successfulAttempts = await Attendance.count({
      where: {
        createdAt: { [Op.gte]: timeRange },
        status: 'present'
      }
    });

    // Get blocked attempts
    const blockedAttempts = await SecurityLog.count({
      where: {
        createdAt: { [Op.gte]: timeRange },
        type: {
          [Op.in]: ['blocked_device', 'blocked_ip', 'security_violation']
        }
      }
    });

    // Get average security score
    const avgSecurityScore = await Attendance.findOne({
      where: {
        createdAt: { [Op.gte]: timeRange }
      },
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('securityScore')), 'avgScore']
      ],
      raw: true
    });

    // Get risk distribution
    const riskDistribution = {
      low: await Attendance.count({
        where: {
          createdAt: { [Op.gte]: timeRange },
          securityScore: { [Op.gte]: 80 }
        }
      }),
      medium: await Attendance.count({
        where: {
          createdAt: { [Op.gte]: timeRange },
          securityScore: { [Op.gte]: 60, [Op.lt]: 80 }
        }
      }),
      high: await Attendance.count({
        where: {
          createdAt: { [Op.gte]: timeRange },
          securityScore: { [Op.gte]: 40, [Op.lt]: 60 }
        }
      }),
      critical: await Attendance.count({
        where: {
          createdAt: { [Op.gte]: timeRange },
          securityScore: { [Op.lt]: 40 }
        }
      })
    };

    // Get timeline data (hourly for last 24h)
    const timelineData = [];
    const hoursToCheck = timeframe === '1h' ? 1 : timeframe === '7d' ? 168 : 24;
    
    for (let i = hoursToCheck - 1; i >= 0; i--) {
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourEnd = new Date(Date.now() - (i - 1) * 60 * 60 * 1000);
      
      const hourlyAttempts = await Attendance.count({
        where: {
          createdAt: { [Op.gte]: hourStart, [Op.lt]: hourEnd }
        }
      });
      
      const hourlyBlocked = await SecurityLog.count({
        where: {
          createdAt: { [Op.gte]: hourStart, [Op.lt]: hourEnd },
          type: {
            [Op.in]: ['blocked_device', 'blocked_ip', 'security_violation']
          }
        }
      });
      
      const hourlyAvgScore = await Attendance.findOne({
        where: {
          createdAt: { [Op.gte]: hourStart, [Op.lt]: hourEnd }
        },
        attributes: [
          [require('sequelize').fn('AVG', require('sequelize').col('securityScore')), 'avgScore']
        ],
        raw: true
      });
      
      timelineData.push({
        timestamp: hourStart.toISOString(),
        attempts: hourlyAttempts,
        blockedCount: hourlyBlocked,
        averageScore: Math.round(parseFloat(hourlyAvgScore?.avgScore) || 0)
      });
    }

    const metrics = {
      totalAttempts,
      successfulAttempts,
      blockedAttempts,
      averageSecurityScore: Math.round(parseFloat(avgSecurityScore?.avgScore) || 0),
      riskDistribution,
      timelineData,
      timeframe,
      generatedAt: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    console.error('Get security metrics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Block/Unblock device
router.post('/device/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { deviceFingerprint, reason } = req.body;

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (!deviceFingerprint) {
      return res.status(400).json({ message: 'Device fingerprint is required' });
    }

    const deviceRecord = await DeviceTracking.findOne({
      where: { deviceFingerprint }
    });

    if (!deviceRecord) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const isBlocked = action === 'block';
    await deviceRecord.update({ isBlocked });

    // Log the action
    await SecurityService.logSecurityIncident(
      isBlocked ? 'blocked_device' : 'unblocked_device',
      {
        deviceFingerprint,
        reason: reason || `Device ${action}ed by admin`,
        rollNumber: deviceRecord.rollNumber
      },
      isBlocked ? 'high' : 'low'
    );

    res.json({
      success: true,
      message: `Device ${action}ed successfully`,
      device: {
        deviceFingerprint: deviceFingerprint.substring(0, 10) + '...',
        rollNumber: deviceRecord.rollNumber,
        isBlocked
      }
    });
  } catch (error) {
    console.error('Device block/unblock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get blocked devices
router.get('/blocked-devices', async (req, res) => {
  try {
    const blockedDevices = await DeviceTracking.findAll({
      where: { isBlocked: true },
      order: [['updatedAt', 'DESC']]
    });

    const formattedDevices = blockedDevices.map(device => ({
      id: device.id,
      deviceFingerprint: device.deviceFingerprint.substring(0, 10) + '...',
      rollNumber: device.rollNumber,
      ipAddress: device.ipAddress,
      riskScore: device.riskScore,
      blockedAt: device.updatedAt
    }));

    res.json(formattedDevices);
  } catch (error) {
    console.error('Get blocked devices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Resolve security alert
router.put('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { resolution } = req.body;

    const alert = await SecurityLog.findByPk(alertId);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.update({
      resolved: true,
      data: {
        ...alert.data,
        resolution: resolution || 'Resolved by admin',
        resolvedAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alert: {
        id: alert.id,
        type: alert.type,
        resolved: true
      }
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;