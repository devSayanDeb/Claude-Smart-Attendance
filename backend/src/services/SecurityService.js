const { SecurityLog, DeviceTracking, Attendance } = require('../models');
const { Op } = require('sequelize');
const geoip = require('geoip-lite');

class SecurityService {
  constructor() {
    this.SECURITY_CONFIG = {
      OTP_EXPIRY: 90000, // 90 seconds
      MAX_DEVICES_PER_IP: 3,
      MAX_STUDENTS_PER_DEVICE: 1,
      MIN_SUBMISSION_INTERVAL: 5000, // 5 seconds
      SECURITY_SCORE_THRESHOLD: 60,
      SUSPICIOUS_PATTERN_THRESHOLD: 5,
      GEOLOCATION_RADIUS: 1000, // meters
      BEHAVIORAL_ANALYSIS_DAYS: 30
    };
    
    this.blockedDevices = new Set();
    this.blockedIPs = new Set();
    this.suspiciousPatterns = new Map();
  }

  async analyzeSecurityRisk(data) {
    const analysis = {
      score: 100,
      flags: [],
      blocked: false,
      reason: null
    };

    // Device analysis
    const deviceRisk = await this.analyzeDevice(data.deviceFingerprint, data.rollNumber);
    analysis.score -= deviceRisk.penalty;
    if (deviceRisk.flags.length > 0) analysis.flags.push(...deviceRisk.flags);

    // IP analysis
    const ipRisk = await this.analyzeIP(data.ipAddress, data.rollNumber);
    analysis.score -= ipRisk.penalty;
    if (ipRisk.flags.length > 0) analysis.flags.push(...ipRisk.flags);

    // Timing analysis
    const timingRisk = await this.analyzeTimingPatterns(data);
    analysis.score -= timingRisk.penalty;
    if (timingRisk.flags.length > 0) analysis.flags.push(...timingRisk.flags);

    // Behavioral analysis
    const behaviorRisk = await this.analyzeBehavioralPatterns(data.rollNumber, data);
    analysis.score -= behaviorRisk.penalty;
    if (behaviorRisk.flags.length > 0) analysis.flags.push(...behaviorRisk.flags);

    // Geolocation analysis (if available)
    if (data.geoLocation) {
      const geoRisk = await this.analyzeGeolocation(data.geoLocation, data.sessionId);
      analysis.score -= geoRisk.penalty;
      if (geoRisk.flags.length > 0) analysis.flags.push(...geoRisk.flags);
    }

    // Machine learning pattern detection
    const mlRisk = await this.detectAnomalies(data);
    analysis.score -= mlRisk.penalty;
    if (mlRisk.flags.length > 0) analysis.flags.push(...mlRisk.flags);

    analysis.score = Math.max(0, Math.min(100, analysis.score));

    // Determine if should be blocked
    if (analysis.score < this.SECURITY_CONFIG.SECURITY_SCORE_THRESHOLD) {
      analysis.blocked = true;
      analysis.reason = `Security score too low: ${analysis.score}%. Flags: ${analysis.flags.join(', ')}`;
    }

    return analysis;
  }

  async analyzeDevice(deviceFingerprint, rollNumber) {
    const risk = { penalty: 0, flags: [] };
    
    // Check if device is already blocked
    if (this.blockedDevices.has(deviceFingerprint)) {
      risk.penalty += 100;
      risk.flags.push('Device blocked');
      return risk;
    }

    // Check device history
    const deviceHistory = await DeviceTracking.findAll({
      where: { deviceFingerprint },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (deviceHistory.length > 0) {
      // Check if device used by multiple students
      const uniqueStudents = new Set(deviceHistory.map(h => h.rollNumber));
      if (uniqueStudents.size > this.SECURITY_CONFIG.MAX_STUDENTS_PER_DEVICE) {
        if (!uniqueStudents.has(rollNumber)) {
          risk.penalty += 50;
          risk.flags.push('Device used by multiple students');
        }
      }

      // Check device risk score
      const avgRiskScore = deviceHistory.reduce((sum, h) => sum + h.riskScore, 0) / deviceHistory.length;
      if (avgRiskScore > 70) {
        risk.penalty += 30;
        risk.flags.push('High-risk device');
      }

      // Check rapid usage pattern
      const recentUsage = deviceHistory.filter(h => 
        Date.now() - new Date(h.createdAt).getTime() < 3600000 // Last hour
      );
      if (recentUsage.length > 5) {
        risk.penalty += 25;
        risk.flags.push('Rapid device usage');
      }
    }

    return risk;
  }

  async analyzeIP(ipAddress, rollNumber) {
    const risk = { penalty: 0, flags: [] };

    // Check if IP is blocked
    if (this.blockedIPs.has(ipAddress)) {
      risk.penalty += 100;
      risk.flags.push('IP blocked');
      return risk;
    }

    // Analyze IP geolocation
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      // Check for suspicious countries/regions
      const suspiciousCountries = ['CN', 'RU', 'IR', 'KP']; // Example list
      if (suspiciousCountries.includes(geo.country)) {
        risk.penalty += 20;
        risk.flags.push('Suspicious IP location');
      }

      // Check for VPN/Proxy indicators
      if (this.isProxyIP(ipAddress)) {
        risk.penalty += 40;
        risk.flags.push('Proxy/VPN detected');
      }
    }

    // Check IP usage frequency
    const ipUsage = await DeviceTracking.findAll({
      where: {
        ipAddress,
        createdAt: {
          [Op.gte]: new Date(Date.now() - 3600000) // Last hour
        }
      }
    });

    const uniqueDevices = new Set(ipUsage.map(u => u.deviceFingerprint));
    if (uniqueDevices.size > this.SECURITY_CONFIG.MAX_DEVICES_PER_IP) {
      risk.penalty += 35;
      risk.flags.push('Multiple devices from same IP');
    }

    return risk;
  }

  async analyzeTimingPatterns(data) {
    const risk = { penalty: 0, flags: [] };

    // Check for rapid submissions
    const recentSubmissions = await Attendance.findAll({
      where: {
        [Op.or]: [
          { deviceFingerprint: data.deviceFingerprint },
          { ipAddress: data.ipAddress }
        ],
        createdAt: {
          [Op.gte]: new Date(Date.now() - this.SECURITY_CONFIG.MIN_SUBMISSION_INTERVAL)
        }
      }
    });

    if (recentSubmissions.length > 0) {
      risk.penalty += 45;
      risk.flags.push('Submission too fast');
    }

    // Check for pattern timing (e.g., exactly every X seconds)
    const timingHistory = await Attendance.findAll({
      where: { deviceFingerprint: data.deviceFingerprint },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (timingHistory.length >= 3) {
      const intervals = [];
      for (let i = 1; i < timingHistory.length; i++) {
        const interval = new Date(timingHistory[i-1].createdAt) - new Date(timingHistory[i].createdAt);
        intervals.push(interval);
      }

      // Check if intervals are suspiciously similar (automated)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

      if (variance < 1000) { // Very low variance suggests automation
        risk.penalty += 30;
        risk.flags.push('Automated timing pattern detected');
      }
    }

    return risk;
  }

  async analyzeBehavioralPatterns(rollNumber, data) {
    const risk = { penalty: 0, flags: [] };

    // Get historical behavior
    const historicalData = await Attendance.findAll({
      where: {
        rollNumber,
        createdAt: {
          [Op.gte]: new Date(Date.now() - this.SECURITY_CONFIG.BEHAVIORAL_ANALYSIS_DAYS * 24 * 60 * 60 * 1000)
        }
      },
      order: [['createdAt', 'DESC']]
    });

    if (historicalData.length > 0) {
      // Check device consistency
      const historicalDevices = new Set(historicalData.map(h => h.deviceFingerprint));
      if (!historicalDevices.has(data.deviceFingerprint) && historicalDevices.size > 0) {
        risk.penalty += 15;
        risk.flags.push('New device for student');
      }

      // Check browser consistency
      const historicalBrowsers = new Set(historicalData.map(h => h.browserFingerprint));
      if (!historicalBrowsers.has(data.browserFingerprint) && historicalBrowsers.size > 0) {
        risk.penalty += 10;
        risk.flags.push('New browser fingerprint');
      }

      // Check average security score
      const avgSecurityScore = historicalData.reduce((sum, h) => sum + h.securityScore, 0) / historicalData.length;
      if (avgSecurityScore < 70) {
        risk.penalty += 20;
        risk.flags.push('Historically low security scores');
      }
    }

    return risk;
  }

  async analyzeGeolocation(geoLocation, sessionId) {
    const risk = { penalty: 0, flags: [] };

    // Implementation would check if student location is within reasonable distance of classroom
    // This is a simplified version
    const expectedLocation = { lat: 0, lng: 0 }; // Would get from session/school data
    const distance = this.calculateDistance(
      geoLocation.latitude, 
      geoLocation.longitude,
      expectedLocation.lat,
      expectedLocation.lng
    );

    if (distance > this.SECURITY_CONFIG.GEOLOCATION_RADIUS) {
      risk.penalty += 25;
      risk.flags.push('Location too far from classroom');
    }

    return risk;
  }

  async detectAnomalies(data) {
    const risk = { penalty: 0, flags: [] };

    // Simple anomaly detection based on patterns
    const patternKey = `${data.rollNumber}_${new Date().getHours()}`;
    const currentPattern = this.suspiciousPatterns.get(patternKey) || 0;
    
    if (currentPattern > this.SECURITY_CONFIG.SUSPICIOUS_PATTERN_THRESHOLD) {
      risk.penalty += 30;
      risk.flags.push('Suspicious activity pattern');
    }

    this.suspiciousPatterns.set(patternKey, currentPattern + 1);

    return risk;
  }

  async logSecurityIncident(type, data, severity = 'medium') {
    await SecurityLog.create({
      type,
      sessionId: data.sessionId,
      studentId: data.studentId,
      rollNumber: data.rollNumber,
      deviceFingerprint: data.deviceFingerprint,
      ipAddress: data.ipAddress,
      reason: data.reason || 'Security violation detected',
      severity,
      data: data
    });
  }

  async blockDevice(deviceFingerprint, reason) {
    this.blockedDevices.add(deviceFingerprint);
    await this.logSecurityIncident('blocked_device', { deviceFingerprint, reason }, 'high');
  }

  async blockIP(ipAddress, reason) {
    this.blockedIPs.add(ipAddress);
    await this.logSecurityIncident('blocked_ip', { ipAddress, reason }, 'high');
  }

  async getSessionAlerts(sessionId) {
    return await SecurityLog.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    });
  }

  isProxyIP(ipAddress) {
    // Simplified proxy detection - in production, use a proper service
    const proxyRanges = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
    // Add more sophisticated proxy detection logic
    return false;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}

module.exports = new SecurityService();