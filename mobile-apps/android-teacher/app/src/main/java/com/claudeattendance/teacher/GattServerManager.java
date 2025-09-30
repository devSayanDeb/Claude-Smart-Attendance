package com.claudeattendance.teacher;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattServer;
import android.bluetooth.BluetoothGattServerCallback;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

public class GattServerManager {
    private static final String TAG = "GattServerManager";
    private static GattServerManager instance;
    
    // Service and Characteristic UUIDs
    private static final UUID ATTENDANCE_SERVICE_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abc");
    private static final UUID OTP_CHARACTERISTIC_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abd");
    private static final UUID SESSION_CHARACTERISTIC_UUID = UUID.fromString("12345678-1234-1234-1234-123456789abe");
    
    private BluetoothGattServer gattServer;
    private BluetoothManager bluetoothManager;
    private String currentSessionId;
    private Map<String, String> deviceOtpMap = new HashMap<>();
    private Map<String, Long> otpTimestamps = new HashMap<>();
    
    public static GattServerManager getInstance() {
        if (instance == null) {
            instance = new GattServerManager();
        }
        return instance;
    }
    
    public void startServer(Context context, String sessionId) {
        this.currentSessionId = sessionId;
        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "Bluetooth permission not granted");
            return;
        }
        
        gattServer = bluetoothManager.openGattServer(context, gattServerCallback);
        
        // Create attendance service
        BluetoothGattService attendanceService = new BluetoothGattService(
            ATTENDANCE_SERVICE_UUID,
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        );
        
        // OTP characteristic (readable by students)
        BluetoothGattCharacteristic otpCharacteristic = new BluetoothGattCharacteristic(
            OTP_CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        );
        
        // Session characteristic (readable by students)
        BluetoothGattCharacteristic sessionCharacteristic = new BluetoothGattCharacteristic(
            SESSION_CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        );
        
        sessionCharacteristic.setValue(sessionId.getBytes(StandardCharsets.UTF_8));
        
        attendanceService.addCharacteristic(otpCharacteristic);
        attendanceService.addCharacteristic(sessionCharacteristic);
        
        gattServer.addService(attendanceService);
        
        Log.d(TAG, "GATT Server started for session: " + sessionId);
    }
    
    public void stopServer() {
        if (gattServer != null) {
            gattServer.close();
            gattServer = null;
            deviceOtpMap.clear();
            otpTimestamps.clear();
            Log.d(TAG, "GATT Server stopped");
        }
    }
    
    private final BluetoothGattServerCallback gattServerCallback = new BluetoothGattServerCallback() {
        @Override
        public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
            super.onConnectionStateChange(device, status, newState);
            Log.d(TAG, "Connection state changed: " + device.getAddress() + " State: " + newState);
        }
        
        @Override
        public void onCharacteristicReadRequest(BluetoothDevice device, int requestId, int offset,
                BluetoothGattCharacteristic characteristic) {
            super.onCharacteristicReadRequest(device, requestId, offset, characteristic);
            
            String deviceAddress = device.getAddress();
            Log.d(TAG, "Characteristic read request from: " + deviceAddress);
            
            if (OTP_CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                // Generate or retrieve OTP for this device
                String otp = getOrGenerateOtp(deviceAddress);
                
                if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 
                        offset, otp.getBytes(StandardCharsets.UTF_8));
                }
                
                // Send OTP to backend for validation
                sendOtpToBackend(deviceAddress, otp, currentSessionId);
                
            } else if (SESSION_CHARACTERISTIC_UUID.equals(characteristic.getUuid())) {
                if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 
                        offset, currentSessionId.getBytes(StandardCharsets.UTF_8));
                }
            } else {
                if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED) {
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, 0, null);
                }
            }
        }
    };
    
    private String getOrGenerateOtp(String deviceAddress) {
        // Check if we already have a valid OTP for this device
        String existingOtp = deviceOtpMap.get(deviceAddress);
        Long timestamp = otpTimestamps.get(deviceAddress);
        
        // Check if OTP is still valid (within 90 seconds)
        if (existingOtp != null && timestamp != null) {
            long currentTime = System.currentTimeMillis();
            if (currentTime - timestamp < 90000) { // 90 seconds
                return existingOtp;
            }
        }
        
        // Generate new OTP
        String newOtp = String.format("%06d", new Random().nextInt(999999));
        deviceOtpMap.put(deviceAddress, newOtp);
        otpTimestamps.put(deviceAddress, System.currentTimeMillis());
        
        Log.d(TAG, "Generated new OTP for device " + deviceAddress + ": " + newOtp);
        return newOtp;
    }
    
    private void sendOtpToBackend(String deviceAddress, String otp, String sessionId) {
        // Send OTP generation info to backend for later validation
        new Thread(() -> {
            try {
                OtpData otpData = new OtpData(
                    otp,
                    sessionId,
                    deviceAddress,
                    System.currentTimeMillis(),
                    System.currentTimeMillis() + 90000 // expires in 90 seconds
                );
                ApiClient.logOtpGeneration(otpData);
                Log.d(TAG, "OTP logged to backend: " + otp);
            } catch (Exception e) {
                Log.e(TAG, "Failed to log OTP to backend", e);
            }
        }).start();
    }
}