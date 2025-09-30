package com.claudeattendance.teacher;

import android.util.Log;

import com.google.gson.Gson;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;

public class ApiClient {
    private static final String TAG = "ApiClient";
    private static final String BASE_URL = "https://your-backend-domain.com/api";
    private static final Gson gson = new Gson();
    
    public static void createSession(SessionData sessionData) throws IOException {
        String endpoint = BASE_URL + "/sessions";
        String jsonData = gson.toJson(sessionData);
        
        HttpURLConnection connection = createConnection(endpoint, "POST");
        
        try (OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream())) {
            writer.write(jsonData);
            writer.flush();
        }
        
        int responseCode = connection.getResponseCode();
        if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
            Log.d(TAG, "Session created successfully");
        } else {
            throw new IOException("Failed to create session: " + responseCode);
        }
        
        connection.disconnect();
    }
    
    public static void logOtpGeneration(OtpData otpData) throws IOException {
        String endpoint = BASE_URL + "/otp/generate";
        String jsonData = gson.toJson(otpData);
        
        HttpURLConnection connection = createConnection(endpoint, "POST");
        
        try (OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream())) {
            writer.write(jsonData);
            writer.flush();
        }
        
        int responseCode = connection.getResponseCode();
        if (responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED) {
            Log.d(TAG, "OTP logged successfully");
        } else {
            throw new IOException("Failed to log OTP: " + responseCode);
        }
        
        connection.disconnect();
    }
    
    private static HttpURLConnection createConnection(String endpoint, String method) throws IOException {
        URL url = new URL(endpoint);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        connection.setRequestMethod(method);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        
        return connection;
    }
}