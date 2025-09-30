package com.claudeattendance.teacher;

public class SessionData {
    private String sessionId;
    private String teacherId;
    private String className;
    private String period;
    private String room;
    private long timestamp;
    
    public SessionData(String sessionId, String teacherId, String className, 
                      String period, String room, long timestamp) {
        this.sessionId = sessionId;
        this.teacherId = teacherId;
        this.className = className;
        this.period = period;
        this.room = room;
        this.timestamp = timestamp;
    }
    
    // Getters and setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public String getTeacherId() { return teacherId; }
    public void setTeacherId(String teacherId) { this.teacherId = teacherId; }
    
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    
    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
    
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}