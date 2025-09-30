# 🏗️ System Architecture

## Overview

The Claude Smart Attendance System is built on a multi-layered architecture designed for security, scalability, and reliability.

## Component Architecture

### Frontend Layer
```
┌─────────────────┐    ┌─────────────────┐
│  Teacher Portal │    │ Student Portal  │
│    (Web App)    │    │   (PWA/Mobile)  │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────┬───────────────┘
                 │
         ┌─────────────────┐
         │ Bluetooth Layer │
         │  (BLE Beacons)  │
         └─────────────────┘
```

### Backend Layer
```
┌─────────────────┐
│  n8n Workflows │
│   (Automation)  │
└─────────────────┘
         │
┌─────────────────┐
│   Webhooks API  │
│  (Data Router)  │
└─────────────────┘
         │
┌─────────────────┐
│ Security Engine │
│ (Anti-Proxy)    │
└─────────────────┘
```

### Data Layer
```
┌─────────────────┐
│  Google Sheets  │
│   (Database)    │
├─────────────────┤
│ • Sessions      │
│ • Attendance    │
│ • OTP Logs      │
│ • Device Track  │
│ • Security Logs │
└─────────────────┘
```

## Data Flow Architecture

### 1. Session Creation Flow
```
Teacher Portal → n8n Webhook → Google Sheets (Sessions)
                     ↓
               Bluetooth Beacon
                  Activation
```

### 2. Attendance Submission Flow
```
Student Device → Bluetooth Scan → OTP Receipt → Web Form
                                                    ↓
              Security Pipeline ← n8n Webhook ← Form Submit
                     ↓
               Google Sheets (Multiple Tables)
```

### 3. Security Validation Pipeline
```
Incoming Data → Device Check → IP Check → Browser Check
                                              ↓
              Time Pattern → One Device Rule → History Check
                                              ↓
                         Success/Block Decision
```

## Technology Stack

### Frontend Technologies
- **HTML5/CSS3/JavaScript**: Core web technologies
- **Web Bluetooth API**: For BLE communication
- **Progressive Web App (PWA)**: Mobile-first approach
- **Responsive Design**: Cross-device compatibility

### Backend Technologies
- **n8n**: Workflow automation platform
- **Node.js**: Runtime environment
- **Webhook APIs**: RESTful data endpoints
- **Google Sheets API**: Database operations

### Security Technologies
- **Bluetooth Low Energy (BLE)**: Proximity verification
- **Device Fingerprinting**: Browser/device identification
- **OTP Generation**: Time-based one-time passwords
- **Pattern Recognition**: Behavioral analysis

## Security Architecture

### Multi-Layer Security Model
```
┌─────────────────────────────────────┐
│         Physical Layer              │
│    (Bluetooth Proximity 10-30ft)   │
├─────────────────────────────────────┤
│         Device Layer                │
│   (Unique Device Fingerprinting)   │
├─────────────────────────────────────┤
│         Network Layer               │
│     (IP Monitoring & Blocking)      │
├─────────────────────────────────────┤
│       Behavioral Layer              │
│   (Time Patterns & History)         │
├─────────────────────────────────────┤
│       Application Layer             │
│    (OTP Validation & Duplicates)    │
└─────────────────────────────────────┘
```

### Anti-Proxy Mechanisms

1. **Physical Verification**
   - Bluetooth range enforcement
   - Real-time proximity detection
   - Beacon signal strength validation

2. **Device Verification**
   - Unique device fingerprints
   - Hardware-based identification
   - One-device-per-student rule

3. **Network Verification**
   - IP address tracking
   - Geolocation validation
   - Network pattern analysis

4. **Behavioral Verification**
   - Submission timing analysis
   - Historical pattern matching
   - Anomaly detection algorithms

## Database Schema

### Sessions Sheet
```
Columns:
- session_id (Primary Key)
- teacher_id
- class_name
- period_number
- room_number
- date_time
- status
- created_at
```

### Attendance Sheet
```
Columns:
- attendance_id (Primary Key)
- session_id (Foreign Key)
- student_roll
- device_id
- ip_address
- browser_fingerprint
- submission_time
- otp_used
- status
```

### Device Track Sheet
```
Columns:
- device_id (Primary Key)
- student_roll
- last_used_session
- usage_count
- blocked_status
- first_seen
- last_seen
```

### Security Logs Sheet
```
Columns:
- log_id (Primary Key)
- session_id
- student_roll
- security_check
- result
- details
- timestamp
```

## Scalability Considerations

### Horizontal Scaling
- n8n workflow distribution
- Multiple Google Sheets for large institutions
- CDN for static assets

### Performance Optimization
- Bluetooth connection pooling
- Async data processing
- Caching mechanisms
- Batch operations for database updates

### Monitoring & Analytics
- Real-time security dashboards
- Performance metrics tracking
- Usage pattern analysis
- System health monitoring

## Deployment Architecture

### Development Environment
```
Local Machine → n8n Local → Google Sheets (Test)
```

### Staging Environment
```
Staging Server → n8n Cloud → Google Sheets (Staging)
```

### Production Environment
```
Production Server → n8n Cloud → Google Sheets (Production)
                    ↓
                CDN/Load Balancer
```

## Integration Points

### External APIs
- Google Sheets API v4
- Web Bluetooth API
- Geolocation API
- Push Notification API

### Webhook Endpoints
- `/webhook/session-create`
- `/webhook/attendance-submit`
- `/webhook/security-alert`
- `/webhook/admin-override`

### Data Export
- CSV export functionality
- PDF report generation
- API endpoints for LMS integration
- Real-time data streaming

This architecture ensures robust security, scalability, and maintainability while providing real-time attendance tracking with comprehensive anti-proxy measures.