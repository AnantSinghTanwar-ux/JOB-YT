import 'dotenv/config';
import pool from '../config/database';
import { initFirebase } from '../config/firebase';
import { DeviceTokenModel } from '../models/deviceToken.model';
import { PushNotificationService } from '../services/push.service';

async function run() {
  console.log('--- STARTING NOTIFICATION LIFECYCLE INTEGRATION TEST ---');
  
  // 1. Initialize Firebase Admin SDK
  console.log('1. Initializing Firebase Admin SDK...');
  initFirebase();

  let client;
  let testUserId: string;
  try {
    client = await pool.connect();

    // Create a temporary test user
    console.log('2. Setting up test user...');
    const userRes = await client.query(
      "INSERT INTO users (email, password_hash, role, referral_code) VALUES ('notify_test@test.com', 'pwd', 'applicant', 'NOTIFY123') RETURNING id"
    );
    testUserId = userRes.rows[0].id;
    console.log(`Test user created with ID: ${testUserId}`);

    // A. FCM Token Lifecycle
    console.log('\n--- PART A: FCM Native Token Lifecycle ---');
    
    // Simulate push token generation
    const mockFCMToken = 'APA91bH_simulated_FCM_Token_For_Lifecycle_Testing_12345';
    console.log(`Simulated FCM Token Generated: ${mockFCMToken}`);

    // Register Token (simulating /users/me/device-tokens registration)
    console.log('Registering FCM token in DB...');
    const fcmReg = await DeviceTokenModel.register(testUserId, mockFCMToken, 'android');
    console.log('Token registered successfully:', fcmReg);

    // Database Persistence Verification
    console.log('Verifying token database persistence...');
    const savedTokensAfterReg = await DeviceTokenModel.findByUser(testUserId);
    console.log(`Found ${savedTokensAfterReg.length} token(s) in database for user.`);
    if (savedTokensAfterReg.length !== 1 || savedTokensAfterReg[0].token !== mockFCMToken) {
      throw new Error('Database persistence check failed for FCM token!');
    }
    console.log('✅ FCM token persisted correctly in database.');

    // Notification Dispatch
    console.log('Dispatching notification. This will call firebase-admin multicast and trigger invalid token cleanup.');
    await PushNotificationService.sendPushNotification(testUserId, 'Test Notification Title', 'Test Notification Body');

    // Wait short time for async db operations if any
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify token cleanup (acceptance / invalidation check)
    console.log('Verifying token cleanup in DB after dispatch failure...');
    const savedTokensAfterDispatch = await DeviceTokenModel.findByUser(testUserId);
    console.log(`Found ${savedTokensAfterDispatch.length} token(s) in database for user.`);
    if (savedTokensAfterDispatch.length !== 0) {
      throw new Error('Invalid FCM token was not cleaned up from database!');
    }
    console.log('✅ FCM acceptance failure / invalid token cleanup verified successfully.');

    // B. Expo Token Lifecycle
    console.log('\n--- PART B: Expo Token Lifecycle ---');
    const mockExpoToken = 'ExponentPushToken[mock_expo_lifecycle_token]';
    console.log(`Simulated Expo Token Generated: ${mockExpoToken}`);

    console.log('Registering Expo token in DB...');
    const expoReg = await DeviceTokenModel.register(testUserId, mockExpoToken, 'ios');
    console.log('Token registered successfully:', expoReg);

    console.log('Verifying token database persistence...');
    const savedExpoTokens = await DeviceTokenModel.findByUser(testUserId);
    if (savedExpoTokens.length !== 1 || savedExpoTokens[0].token !== mockExpoToken) {
      throw new Error('Database persistence check failed for Expo token!');
    }
    console.log('✅ Expo token persisted correctly in database.');

    console.log('Dispatching Expo notification...');
    // We expect this to run sendExpoPush mock/real fallback without crashes
    await PushNotificationService.sendPushNotification(testUserId, 'Expo Test Title', 'Expo Test Body');

    console.log('--- ALL NOTIFICATION LIFECYCLE TESTS COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('❌ Notification Lifecycle Test Failed:', err);
  } finally {
    if (client) {
      console.log('Cleaning up mock user...');
      await client.query("DELETE FROM users WHERE email = 'notify_test@test.com'");
      client.release();
    }
    await pool.end();
  }
}

run();
