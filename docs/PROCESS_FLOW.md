# 🎯 Smart Attendance System - Complete Process Flow

## 📘 PHASE 1: TEACHER FLOW (Blue Section)

### Step 1: Teacher Login
- Teacher accesses the Teacher Portal
- Authenticates with teacher credentials
- System verifies teacher permissions

### Step 2: Create Session
- Teacher enters session details:
  - Class name
  - Period number
  - Room number
  - Date and time
- System generates unique session ID

### Step 3: Enable Bluetooth
- Teacher enables Bluetooth on device/classroom system
- System initializes Bluetooth adapter
- Prepares for student device connections

### Step 4: Start Beacon
- System starts broadcasting Bluetooth beacon
- Beacon range: 10-30 feet (classroom coverage)
- Contains session identification data

### Step 5: Send to Backend
- Session data transmitted to n8n backend
- Includes all session parameters
- Activates the attendance collection process

## 🟢 PHASE 2: STUDENT FLOW (Green Section)

### Step 6: Student Login
- Student accesses Student Portal
- Enters student credentials
- System verifies student enrollment

### Step 7: Enable Bluetooth
- Student enables Bluetooth on mobile device
- App requests Bluetooth permissions
- Device prepares to scan for beacons

### Step 8: Search Beacon (10-30 feet)
- Student's device scans for teacher's beacon
- Effective range: 10-30 feet maximum
- Ensures physical presence in classroom

### Step 9: Found? (Decision Point)
- **If NOT Found**: → Student gets "Failed: Out of Range" error
- **If Found**: → Proceed to connection step

### Step 10: Connect & Get OTP
- Device connects to teacher's Bluetooth beacon
- System generates unique OTP for this student
- OTP transmitted ONLY via Bluetooth (not internet)

### Step 11: Enter Roll + OTP
- Student enters their roll number in web app
- Student enters the received OTP
- System validates both entries

### Step 12: Capture Device Data
System captures:
- Device ID (unique device identifier)
- IP Address (network location)
- Browser fingerprint (unique browser signature)
- Timestamp (exact submission time)

### Step 13: Submit in 90s
- Student submits attendance within 90-second time limit
- Data sent to n8n backend for processing
- Timer enforces rapid submission

## 🟠 PHASE 3: BACKEND PROCESSING (Orange Section)

### Step 14: n8n Webhook
- Backend receives attendance submission
- Parses incoming data
- Prepares for validation process

### Step 15: Route Type (Decision Point)
- **If Session Data**: → Store in Sessions Sheet
- **If Attendance Data**: → Proceed to verification

### Step 16: Verify OTP
- Checks OTP authenticity against generated OTP
- Validates 90-second expiration time
- Confirms OTP matches student and session

### Step 17: Valid OTP? (Decision Point)
- **If Invalid**: → "Reject: Invalid OTP" error
- **If Valid**: → Proceed to duplicate check

### Step 18: Check Duplicates
- Searches Google Sheets for existing attendance
- Checks same roll number + same session
- Prevents multiple submissions

### Step 19: Duplicate? (Decision Point)
- **If Duplicate Found**: → "Reject: Already Marked" error
- **If No Duplicate**: → Proceed to security checks

## 🔴 PHASE 4: ANTI-PROXY SECURITY CHECKS (Red Section)

### Step 20: Security Checks Entry Point
- Initiates comprehensive anti-proxy validation
- Multiple security layers activated
- Suspicious activity detection begins

### Step 21: Device Check (Decision Point)
- Verifies device hasn't been used for multiple students
- Checks device blocking status
- **If Blocked**: → "Reject: Device" error
- **If OK**: → Continue to IP check

### Step 22: IP Check (Decision Point)
- Validates IP address hasn't submitted multiple students
- Prevents network-level proxy attempts
- **If Blocked**: → "Reject: IP" error
- **If OK**: → Continue to browser check

### Step 23: Browser Check (Decision Point)
- Analyzes browser fingerprint uniqueness
- Detects browser spoofing attempts
- **If Suspicious**: → "Reject: Browser" error
- **If OK**: → Continue to time pattern check

### Step 24: Time Pattern Check (Decision Point)
- Analyzes submission timing patterns
- Detects rapid successive submissions
- **If Too Fast**: → "Reject: Speed" error
- **If OK**: → Continue to device rule check

### Step 25: One Device Rule (Decision Point)
- Enforces one device per student per session
- Prevents device sharing for attendance
- **If Violation**: → "Reject: Multiple" error
- **If OK**: → Continue to history validation

### Step 26: Validate History
- Cross-references with student's past attendance patterns
- Checks device-student association history
- Validates behavioral consistency

### Step 27: Security Pass? (Decision Point)
- Overall security score calculation
- **If Failed**: → Flag & Block process
- **If Passed**: → Save attendance data

## 🟣 PHASE 5: DATABASE STORAGE (Purple Section)

### Step 28A: Save Data (Success Path)
- Attendance record saved to Attendance Sheet
- OTP usage logged to OTP Log Sheet
- Device association saved to Device Track Sheet

### Step 28B: Flag & Block (Security Path)
- Suspicious attempt logged to Blocks Sheet
- Security incident recorded
- Pattern analysis updated

## ⚪ PHASE 6: RESPONSE FLOW (Gray Section)

### Step 29A: Success Response
- Confirmation sent to student's device
- Attendance marked successfully
- Positive feedback displayed

### Step 29B: Error Response
- Specific error message sent to student
- Reason for rejection clearly stated
- Guidance for resolution provided

### Step 30: Security Alert
- Teacher notified of security incidents
- Dashboard updated with flagged attempts
- Manual review option available

## 🛡️ SECURITY FEATURES SUMMARY

### Physical Presence Enforcement:
- Bluetooth range limitation (10-30 feet)
- Beacon-based proximity verification
- No internet-based OTP sharing possible

### Anti-Proxy Measures:
- One device per student rule
- IP address monitoring and blocking
- Browser fingerprint analysis
- Time pattern detection
- Historical behavior validation

### Data Integrity:
- OTP expiration (90 seconds)
- Duplicate detection
- Audit trail maintenance
- Real-time security monitoring

### Teacher Control:
- Session management dashboard
- Security alert notifications
- Manual override capabilities
- Attendance verification tools

---

This comprehensive system ensures that only physically present students can mark attendance while preventing proxy attempts through multiple security layers.