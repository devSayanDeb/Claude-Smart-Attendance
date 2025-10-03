const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('teacher', 'student', 'admin'),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rollNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['rollNumber'] },
    { fields: ['role'] }
  ]
});

// Session Model
const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teacherId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  className: {
    type: DataTypes.STRING,
    allowNull: false
  },
  period: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  beaconData: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['teacherId'] },
    { fields: ['date'] },
    { fields: ['status'] }
  ]
});

// Attendance Model
const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Session, key: 'id' }
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  rollNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late'),
    defaultValue: 'present'
  },
  securityScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 100 }
  },
  deviceFingerprint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  browserFingerprint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  geoLocation: {
    type: DataTypes.JSON,
    allowNull: true
  },
  securityFlags: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['sessionId'] },
    { fields: ['studentId'] },
    { fields: ['rollNumber'] },
    { fields: ['timestamp'] }
  ]
});

// OTP Model
const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Session, key: 'id' }
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deviceFingerprint: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['sessionId', 'studentId'] },
    { fields: ['otp'] },
    { fields: ['expiresAt'] }
  ]
});

// Security Log Model
const SecurityLog = sequelize.define('SecurityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('blocked_device', 'blocked_ip', 'suspicious_pattern', 'failed_attempt', 'security_violation'),
    allowNull: false
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  rollNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceFingerprint: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['type'] },
    { fields: ['severity'] },
    { fields: ['createdAt'] }
  ]
});

// Device Tracking Model
const DeviceTracking = sequelize.define('DeviceTracking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  deviceFingerprint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rollNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  riskScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['deviceFingerprint'] },
    { fields: ['studentId'] },
    { fields: ['sessionId'] }
  ]
});

// Define associations
User.hasMany(Session, { foreignKey: 'teacherId' });
Session.belongsTo(User, { foreignKey: 'teacherId' });

Session.hasMany(Attendance, { foreignKey: 'sessionId' });
Attendance.belongsTo(Session, { foreignKey: 'sessionId' });

User.hasMany(Attendance, { foreignKey: 'studentId' });
Attendance.belongsTo(User, { foreignKey: 'studentId' });

Session.hasMany(OTP, { foreignKey: 'sessionId' });
OTP.belongsTo(Session, { foreignKey: 'sessionId' });

User.hasMany(OTP, { foreignKey: 'studentId' });
OTP.belongsTo(User, { foreignKey: 'studentId' });

module.exports = {
  sequelize,
  User,
  Session,
  Attendance,
  OTP,
  SecurityLog,
  DeviceTracking
};