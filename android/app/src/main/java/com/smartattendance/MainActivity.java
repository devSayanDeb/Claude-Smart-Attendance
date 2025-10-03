package com.smartattendance;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.ParcelUuid;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "SmartAttendance";
    private static final int REQUEST_ENABLE_BT = 1;
    private static final int REQUEST_PERMISSIONS = 2;
    
    // Bluetooth components
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser bluetoothLeAdvertiser;
    private boolean isAdvertising = false;
    
    // UI Components
    private EditText etClassName, etPeriod, etRoomNumber, etTeacherId;
    private Button btnStartSession, btnStopSession;
    private TextView tvStatus, tvConnectedStudents, tvSessionInfo;
    
    // Session data
    private String currentSessionId;
    private Map<String, OTPData> activeOTPs = new HashMap<>();
    
    // HTTP Client
    private OkHttpClient httpClient;
    private static final String BASE_URL = "http://your-backend-url.com/api"; // Change this to your backend URL
    
    // Beacon configuration
    private static final String BEACON_UUID = "12345678-1234-1234-1234-123456789abc";
    private static final String SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
    
    // OTP data structure
    private static class OTPData {
        String otp;
        String studentId;
        long expiryTime;
        boolean used;
        
        OTPData(String otp, String studentId, long expiryTime) {
            this.otp = otp;
            this.studentId = studentId;
            this.expiryTime = expiryTime;
            this.used = false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeComponents();
        setupBluetooth();
        setupClickListeners();
        setupHttpClient();
        
        Log.i(TAG, "Smart Attendance Teacher App initialized");
    }

    private void initializeComponents() {
        etClassName = findViewById(R.id.etClassName);
        etPeriod = findViewById(R.id.etPeriod);
        etRoomNumber = findViewById(R.id.etRoomNumber);
        etTeacherId = findViewById(R.id.etTeacherId);
        btnStartSession = findViewById(R.id.btnStartSession);
        btnStopSession = findViewById(R.id.btnStopSession);
        tvStatus = findViewById(R.id.tvStatus);
        tvConnectedStudents = findViewById(R.id.tvConnectedStudents);
        tvSessionInfo = findViewById(R.id.tvSessionInfo);
        
        btnStopSession.setEnabled(false);
        
        // Set default values for testing
        etClassName.setText("Computer Science 101");
        etPeriod.setText("1");
        etRoomNumber.setText("A101");
        etTeacherId.setText("T001");
    }

    private void setupHttpClient() {
        httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
    }

    private void setupBluetooth() {
        BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) {
            Toast.makeText(this, "Bluetooth not supported on this device", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        
        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) {
            Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        
        requestPermissions();
    }

    private void requestPermissions() {
        String[] permissions = {
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };
        
        // Add Android 12+ permissions
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissions = new String[]{
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            };
        }
        
        ActivityCompat.requestPermissions(this, permissions, REQUEST_PERMISSIONS);
    }

    private void setupClickListeners() {
        btnStartSession.setOnClickListener(v -> {
            Log.d(TAG, "Start session button clicked");
            startBeaconSession();
        });
        
        btnStopSession.setOnClickListener(v -> {
            Log.d(TAG, "Stop session button clicked");
            stopBeaconSession();
        });
    }

    private void startBeaconSession() {
        String className = etClassName.getText().toString().trim();
        String period = etPeriod.getText().toString().trim();
        String roomNumber = etRoomNumber.getText().toString().trim();
        String teacherId = etTeacherId.getText().toString().trim();
        
        if (className.isEmpty() || period.isEmpty() || roomNumber.isEmpty() || teacherId.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }
        
        Log.d(TAG, "Starting beacon session with: " + className + ", Period: " + period);
        createSessionOnBackend(className, period, roomNumber, teacherId);
    }

    private void createSessionOnBackend(String className, String period, String roomNumber, String teacherId) {
        try {
            JSONObject sessionData = new JSONObject();
            sessionData.put("className", className);
            sessionData.put("period", Integer.parseInt(period));
            sessionData.put("roomNumber", roomNumber);
            sessionData.put("teacherId", teacherId);
            sessionData.put("date", new java.util.Date().toString());
            sessionData.put("startTime", new java.util.Date().toString());
            
            RequestBody body = RequestBody.create(
                sessionData.toString(),
                MediaType.get("application/json; charset=utf-8")
            );
            
            Request request = new Request.Builder()
                    .url(BASE_URL + "/sessions")
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .build();
            
            Log.d(TAG, "Sending session creation request to: " + BASE_URL + "/sessions");
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(@NonNull Call call, @NonNull IOException e) {
                    Log.e(TAG, "Session creation request failed", e);
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "Failed to create session: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        // For demo purposes, still start the beacon
                        startDemoMode(className, period, roomNumber);
                    });
                }
                
                @Override
                public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    Log.d(TAG, "Session creation response: " + responseBody);
                    
                    if (response.isSuccessful()) {
                        try {
                            JSONObject result = new JSONObject(responseBody);
                            currentSessionId = result.getString("sessionId");
                            
                            Log.i(TAG, "Session created successfully with ID: " + currentSessionId);
                            
                            runOnUiThread(() -> {
                                startBluetoothBeacon();
                                updateUI(true, className, period, roomNumber);
                            });
                        } catch (JSONException e) {
                            Log.e(TAG, "JSON parsing error", e);
                            runOnUiThread(() -> startDemoMode(className, period, roomNumber));
                        }
                    } else {
                        Log.w(TAG, "Session creation failed with code: " + response.code());
                        runOnUiThread(() -> {
                            Toast.makeText(MainActivity.this, "Session creation failed. Starting demo mode.", Toast.LENGTH_SHORT).show();
                            startDemoMode(className, period, roomNumber);
                        });
                    }
                }
            });
            
        } catch (JSONException e) {
            Log.e(TAG, "JSON creation error", e);
            Toast.makeText(this, "Error creating session data", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void startDemoMode(String className, String period, String roomNumber) {
        currentSessionId = "demo-session-" + System.currentTimeMillis();
        Log.i(TAG, "Starting demo mode with session ID: " + currentSessionId);
        startBluetoothBeacon();
        updateUI(true, className, period, roomNumber);
    }

    private void startBluetoothBeacon() {
        if (!bluetoothAdapter.isEnabled()) {
            Log.w(TAG, "Bluetooth not enabled, requesting enable");
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
            return;
        }
        
        bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (bluetoothLeAdvertiser == null) {
            Log.e(TAG, "Bluetooth LE advertising not supported on this device");
            Toast.makeText(this, "Bluetooth advertising not supported", Toast.LENGTH_LONG).show();
            return;
        }
        
        // Configure advertising settings for maximum compatibility
        AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0) // Advertise indefinitely
                .build();
        
        // Create advertisement data
        AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(true)
                .addServiceUuid(ParcelUuid.fromString(BEACON_UUID))
                .build();
        
        // Create scan response data with session info
        AdvertiseData scanResponse = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceData(ParcelUuid.fromString(SERVICE_UUID), 
                    ("SESSION:" + currentSessionId).getBytes())
                .build();
        
        Log.d(TAG, "Starting Bluetooth LE advertising...");
        bluetoothLeAdvertiser.startAdvertising(settings, data, scanResponse, advertiseCallback);
    }

    private final AdvertiseCallback advertiseCallback = new AdvertiseCallback() {
        @Override
        public void onStartSuccess(AdvertiseSettings settingsInEffect) {
            super.onStartSuccess(settingsInEffect);
            isAdvertising = true;
            Log.i(TAG, "Bluetooth advertising started successfully");
            
            runOnUiThread(() -> {
                tvStatus.setText("🟢 Beacon Active - Session: " + 
                    (currentSessionId.length() > 20 ? currentSessionId.substring(0, 20) + "..." : currentSessionId));
                Toast.makeText(MainActivity.this, "Beacon started! Students can now mark attendance.", Toast.LENGTH_LONG).show();
                
                // Start OTP generation timer
                startOTPGenerationTimer();
            });
        }
        
        @Override
        public void onStartFailure(int errorCode) {
            super.onStartFailure(errorCode);
            isAdvertising = false;
            
            String errorMessage = getAdvertisingErrorMessage(errorCode);
            Log.e(TAG, "Bluetooth advertising failed: " + errorMessage + " (Code: " + errorCode + ")");
            
            runOnUiThread(() -> {
                tvStatus.setText("❌ Beacon Failed - " + errorMessage);
                Toast.makeText(MainActivity.this, "Beacon failed: " + errorMessage, Toast.LENGTH_LONG).show();
                updateUI(false, "", "", "");
            });
        }
    };
    
    private String getAdvertisingErrorMessage(int errorCode) {
        switch (errorCode) {
            case AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED:
                return "Already advertising";
            case AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE:
                return "Data too large";
            case AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED:
                return "Feature not supported";
            case AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR:
                return "Internal error";
            case AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS:
                return "Too many advertisers";
            default:
                return "Unknown error";
        }
    }
    
    private void startOTPGenerationTimer() {
        // Simulate OTP generation for demo purposes
        new Thread(() -> {
            while (isAdvertising) {
                try {
                    Thread.sleep(10000); // Generate OTP every 10 seconds for demo
                    if (isAdvertising) {
                        generateDemoOTP();
                    }
                } catch (InterruptedException e) {
                    break;
                }
            }
        }).start();
    }
    
    private void generateDemoOTP() {
        String demoStudentId = "DEMO-" + (System.currentTimeMillis() % 1000);
        String otp = generateOTPForStudent(demoStudentId);
        
        runOnUiThread(() -> {
            tvConnectedStudents.setText("Active OTPs: " + activeOTPs.size() + 
                "\nLatest: " + demoStudentId + " -> " + otp);
        });
    }

    private void stopBeaconSession() {
        Log.d(TAG, "Stopping beacon session");
        
        if (bluetoothLeAdvertiser != null && isAdvertising) {
            bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
            Log.i(TAG, "Stopped Bluetooth advertising");
        }
        
        isAdvertising = false;
        currentSessionId = null;
        activeOTPs.clear();
        
        updateUI(false, "", "", "");
        
        Toast.makeText(this, "Beacon session stopped", Toast.LENGTH_SHORT).show();
        Log.i(TAG, "Beacon session stopped successfully");
    }

    private void updateUI(boolean sessionActive, String className, String period, String roomNumber) {
        btnStartSession.setEnabled(!sessionActive);
        btnStopSession.setEnabled(sessionActive);
        
        if (sessionActive) {
            tvSessionInfo.setText("📚 Class: " + className + "\n🕰️ Period: " + period + "\n📍 Room: " + roomNumber);
            tvSessionInfo.setVisibility(TextView.VISIBLE);
        } else {
            tvStatus.setText("⚪ No Active Session");
            tvConnectedStudents.setText("Connected Students: 0");
            tvSessionInfo.setVisibility(TextView.GONE);
        }
    }

    public String generateOTPForStudent(String studentId) {
        // Clean expired OTPs first
        cleanExpiredOTPs();
        
        String otp = String.valueOf(100000 + (int)(Math.random() * 900000));
        long expiryTime = System.currentTimeMillis() + 90000; // 90 seconds
        
        activeOTPs.put(studentId, new OTPData(otp, studentId, expiryTime));
        
        Log.d(TAG, "Generated OTP for student " + studentId + ": " + otp + " (expires at " + new java.util.Date(expiryTime) + ")");
        
        runOnUiThread(() -> {
            tvConnectedStudents.setText("Active OTPs: " + activeOTPs.size());
        });
        
        return otp;
    }
    
    private void cleanExpiredOTPs() {
        long currentTime = System.currentTimeMillis();
        activeOTPs.entrySet().removeIf(entry -> 
            entry.getValue().expiryTime < currentTime || entry.getValue().used);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == REQUEST_PERMISSIONS) {
            boolean allPermissionsGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allPermissionsGranted = false;
                    break;
                }
            }
            
            if (allPermissionsGranted) {
                Log.i(TAG, "All Bluetooth permissions granted");
                Toast.makeText(this, "Permissions granted. Ready to start beacon.", Toast.LENGTH_SHORT).show();
            } else {
                Log.w(TAG, "Some Bluetooth permissions denied");
                Toast.makeText(this, "Bluetooth permissions required for beacon functionality", Toast.LENGTH_LONG).show();
                // Don't finish the app, let user try again
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == REQUEST_ENABLE_BT) {
            if (resultCode == RESULT_OK) {
                Log.i(TAG, "Bluetooth enabled by user");
                Toast.makeText(this, "Bluetooth enabled", Toast.LENGTH_SHORT).show();
            } else {
                Log.w(TAG, "Bluetooth enable request denied by user");
                Toast.makeText(this, "Bluetooth is required for beacon functionality", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onDestroy() {
        Log.d(TAG, "MainActivity being destroyed");
        if (isAdvertising) {
            stopBeaconSession();
        }
        super.onDestroy();
    }
    
    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "MainActivity paused");
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "MainActivity resumed");
    }
}