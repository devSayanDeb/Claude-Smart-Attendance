import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  PermissionsAndroid, Platform, TextInput, ScrollView
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TeacherBeaconApp = () => {
  const [isBeaconActive, setIsBeaconActive] = useState(false);
  const [sessionData, setSessionData] = useState({
    className: '',
    period: '',
    roomNumber: '',
    teacherId: ''
  });
  const [activeOTPs, setActiveOTPs] = useState(new Map());

  useEffect(() => {
    initializeBLE();
    return () => {
      if (isBeaconActive) {
        stopBeacon();
      }
    };
  }, []);

  const initializeBLE = async () => {
    try {
      if (Platform.OS === 'android') {
        await requestBLEPermissions();
      }
      
      await BleManager.start({ showAlert: false });
      console.log('BLE Manager initialized');
    } catch (error) {
      console.error('BLE initialization error:', error);
    }
  };

  const requestBLEPermissions = async () => {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      console.log('Permission results:', results);
    }
  };

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateOTP = (studentId) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 90000; // 90 seconds
    
    setActiveOTPs(prev => new Map(prev.set(studentId, {
      otp,
      expiryTime,
      used: false
    })));
    
    return otp;
  };

  const startBeacon = async () => {
    try {
      if (!sessionData.className || !sessionData.period || !sessionData.roomNumber) {
        Alert.alert('Error', 'Please fill all session details');
        return;
      }

      const sessionId = generateSessionId();
      
      const beaconData = {
        sessionId,
        teacherId: sessionData.teacherId,
        className: sessionData.className,
        timestamp: Date.now()
      };

      await BleManager.startAdvertising([
        {
          uuid: '12345678-1234-1234-1234-123456789abc',
          major: parseInt(sessionData.period),
          minor: parseInt(sessionData.roomNumber),
          identifier: sessionId,
          manufacturerData: JSON.stringify(beaconData)
        }
      ]);

      await fetch('http://your-backend-url/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionData,
          sessionId,
          startTime: new Date().toISOString(),
          status: 'active'
        })
      });

      setIsBeaconActive(true);
      Alert.alert('Success', 'Beacon started! Students can now mark attendance.');
    } catch (error) {
      console.error('Beacon start error:', error);
      Alert.alert('Error', 'Failed to start beacon');
    }
  };

  const stopBeacon = async () => {
    try {
      await BleManager.stopAdvertising();
      setIsBeaconActive(false);
      setActiveOTPs(new Map());
      Alert.alert('Success', 'Beacon stopped');
    } catch (error) {
      console.error('Beacon stop error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Smart Attendance - Teacher</Text>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Class Name"
          value={sessionData.className}
          onChangeText={(text) => setSessionData(prev => ({...prev, className: text}))}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Period Number"
          value={sessionData.period}
          onChangeText={(text) => setSessionData(prev => ({...prev, period: text}))}
          keyboardType="numeric"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Room Number"
          value={sessionData.roomNumber}
          onChangeText={(text) => setSessionData(prev => ({...prev, roomNumber: text}))}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Teacher ID"
          value={sessionData.teacherId}
          onChangeText={(text) => setSessionData(prev => ({...prev, teacherId: text}))}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isBeaconActive ? styles.stopButton : styles.startButton]}
        onPress={isBeaconActive ? stopBeacon : startBeacon}
      >
        <Text style={styles.buttonText}>
          {isBeaconActive ? 'Stop Session' : 'Start Session'}
        </Text>
      </TouchableOpacity>

      {isBeaconActive && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>🟢 Session Active</Text>
          <Text style={styles.statusText}>Active OTPs: {activeOTPs.size}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
});

export default TeacherBeaconApp;