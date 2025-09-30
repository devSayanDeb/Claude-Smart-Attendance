package com.claudeattendance.teacher;

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
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "TeacherApp";
    private static final int REQUEST_ENABLE_BT = 1001;
    private static final int REQUEST_PERMISSIONS = 1002;
    
    // Custom UUID for our attendance service
    private static final String SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
    
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeAdvertiser bluetoothLeAdvertiser;
    private AdvertiseCallback advertiseCallback;
    
    private EditText editClassName, editPeriod, editRoom, editTeacherId;
    private Button btnStartBeacon, btnStopBeacon, btnCreateSession;
    private TextView txtStatus, txtSessionId;
    
    private boolean isAdvertising = false;
    private String currentSessionId;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initViews();
        initBluetooth();
        requestPermissions();
        setupClickListeners();
    }
    
    private void initViews() {
        editClassName = findViewById(R.id.editClassName);
        editPeriod = findViewById(R.id.editPeriod);
        editRoom = findViewById(R.id.editRoom);
        editTeacherId = findViewById(R.id.editTeacherId);
        
        btnStartBeacon = findViewById(R.id.btnStartBeacon);
        btnStopBeacon = findViewById(R.id.btnStopBeacon);
        btnCreateSession = findViewById(R.id.btnCreateSession);
        
        txtStatus = findViewById(R.id.txtStatus);
        txtSessionId = findViewById(R.id.txtSessionId);
        
        btnStopBeacon.setEnabled(false);
        btnStartBeacon.setEnabled(false);
    }
    
    private void initBluetooth() {
        BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(Context.BLUETOOTH_SERVICE);
        bluetoothAdapter = bluetoothManager.getAdapter();
        
        if (bluetoothAdapter == null) {
            Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }
        
        if (!bluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT);
            }
        }
        
        bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
        if (bluetoothLeAdvertiser == null) {
            Toast.makeText(this, "BLE advertising not supported", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void requestPermissions() {
        String[] permissions = {
            Manifest.permission.BLUETOOTH,
            Manifest.permission.BLUETOOTH_ADMIN,
            Manifest.permission.BLUETOOTH_ADVERTISE,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION
        };
        
        boolean allPermissionsGranted = true;
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                allPermissionsGranted = false;
                break;
            }
        }
        
        if (!allPermissionsGranted) {
            ActivityCompat.requestPermissions(this, permissions, REQUEST_PERMISSIONS);
        } else {
            onPermissionsGranted();
        }
    }
    
    private void onPermissionsGranted() {
        txtStatus.setText("Ready to create session");
        btnCreateSession.setEnabled(true);
    }
    
    private void setupClickListeners() {
        btnCreateSession.setOnClickListener(v -> createSession());
        btnStartBeacon.setOnClickListener(v -> startBeaconAdvertising());
        btnStopBeacon.setOnClickListener(v -> stopBeaconAdvertising());
    }
    
    private void createSession() {
        String className = editClassName.getText().toString().trim();
        String period = editPeriod.getText().toString().trim();
        String room = editRoom.getText().toString().trim();
        String teacherId = editTeacherId.getText().toString().trim();
        
        if (className.isEmpty() || period.isEmpty() || room.isEmpty() || teacherId.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }
        
        // Generate session ID
        currentSessionId = "SES_" + System.currentTimeMillis();
        
        // Create session data
        SessionData sessionData = new SessionData(
            currentSessionId,
            teacherId,
            className,
            period,
            room,
            System.currentTimeMillis()
        );
        
        // Send to backend (implement API call)
        sendSessionToBackend(sessionData);
        
        txtSessionId.setText("Session ID: " + currentSessionId);
        btnStartBeacon.setEnabled(true);
        btnCreateSession.setEnabled(false);
        
        Toast.makeText(this, "Session created successfully", Toast.LENGTH_SHORT).show();
    }
    
    private void startBeaconAdvertising() {
        if (bluetoothLeAdvertiser == null) {
            Toast.makeText(this, "BLE advertising not supported", Toast.LENGTH_SHORT).show();
            return;
        }
        
        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(true)
            .build();
        
        // Create advertise data with session information
        byte[] sessionBytes = currentSessionId.getBytes(StandardCharsets.UTF_8);
        AdvertiseData data = new AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addServiceUuid(ParcelUuid.fromString(SERVICE_UUID))
            .addServiceData(ParcelUuid.fromString(SERVICE_UUID), sessionBytes)
            .build();
        
        advertiseCallback = new AdvertiseCallback() {
            @Override
            public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                super.onStartSuccess(settingsInEffect);
                Log.d(TAG, "Advertising started successfully");
                runOnUiThread(() -> {
                    isAdvertising = true;
                    txtStatus.setText("Beacon Active - Students can now mark attendance");
                    btnStartBeacon.setEnabled(false);
                    btnStopBeacon.setEnabled(true);
                });
            }
            
            @Override
            public void onStartFailure(int errorCode) {
                super.onStartFailure(errorCode);
                Log.e(TAG, "Advertising failed: " + errorCode);
                runOnUiThread(() -> {
                    txtStatus.setText("Failed to start beacon: " + errorCode);
                    Toast.makeText(MainActivity.this, "Failed to start beacon", Toast.LENGTH_SHORT).show();
                });
            }
        };
        
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED) {
            bluetoothLeAdvertiser.startAdvertising(settings, data, advertiseCallback);
            
            // Start GATT server for OTP distribution
            startGattServer();
        }
    }
    
    private void stopBeaconAdvertising() {
        if (bluetoothLeAdvertiser != null && advertiseCallback != null && isAdvertising) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED) {
                bluetoothLeAdvertiser.stopAdvertising(advertiseCallback);
                isAdvertising = false;
                txtStatus.setText("Beacon stopped");
                btnStartBeacon.setEnabled(true);
                btnStopBeacon.setEnabled(false);
                btnCreateSession.setEnabled(true);
                
                // Stop GATT server
                stopGattServer();
            }
        }
    }
    
    private void startGattServer() {
        // Start GATT server to handle OTP requests from students
        GattServerManager.getInstance().startServer(this, currentSessionId);
    }
    
    private void stopGattServer() {
        GattServerManager.getInstance().stopServer();
    }
    
    private void sendSessionToBackend(SessionData sessionData) {
        // Implement API call to backend
        new Thread(() -> {
            try {
                ApiClient.createSession(sessionData);
                runOnUiThread(() -> {
                    Log.d(TAG, "Session sent to backend successfully");
                });
            } catch (Exception e) {
                Log.e(TAG, "Failed to send session to backend", e);
                runOnUiThread(() -> {
                    Toast.makeText(this, "Failed to sync with backend", Toast.LENGTH_SHORT).show();
                });
            }
        }).start();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (isAdvertising) {
            stopBeaconAdvertising();
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSIONS) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (allGranted) {
                onPermissionsGranted();
            } else {
                Toast.makeText(this, "Permissions required for BLE functionality", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ENABLE_BT) {
            if (resultCode == RESULT_OK) {
                bluetoothLeAdvertiser = bluetoothAdapter.getBluetoothLeAdvertiser();
            } else {
                Toast.makeText(this, "Bluetooth required for beacon functionality", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}