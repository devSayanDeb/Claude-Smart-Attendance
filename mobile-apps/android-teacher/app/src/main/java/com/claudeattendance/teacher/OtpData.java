package com.claudeattendance.teacher;

public class OtpData {
    private String otp;
    private String sessionId;
    private String deviceAddress;
    private long createdAt;
    private long expiresAt;
    
    public OtpData(String otp, String sessionId, String deviceAddress, 
                   long createdAt, long expiresAt) {
        this.otp = otp;
        this.sessionId = sessionId;
        this.deviceAddress = deviceAddress;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }
    
    // Getters and setters
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getDeviceAddress() { return deviceAddress; }
    public void setDeviceAddress(String deviceAddress) { this.deviceAddress = deviceAddress; }
    
    public long getCreatedAt() { return createdAt; }
    public void setCreatedAt(long createdAt) { this.createdAt = createdAt; }
    
    public long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(long expiresAt) { this.expiresAt = expiresAt; }
}