import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import Swal from 'sweetalert2';

// Default / Placeholder Firebase Config (Admins can configure this in settings or paste their own)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCeSU11fbjNcojjlfgKudsjq4vIv8C3oSw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "polynomial-node-c2gpt.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "polynomial-node-c2gpt",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "polynomial-node-c2gpt.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "397253837002",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:397253837002:web:7ebe7dbe248c8c72f0b433"
};

export interface NotificationSettings {
  kas: boolean;
  berita: boolean;
  jadwal: boolean;
}

export const getFirebaseConfig = () => {
  const saved = localStorage.getItem('pb_fcm_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // invalid json
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveFirebaseConfig = (config: typeof DEFAULT_FIREBASE_CONFIG) => {
  localStorage.setItem('pb_fcm_config', JSON.stringify(config));
};

export const getVapidKey = () => {
  return localStorage.getItem('pb_fcm_vapid_key') || import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
};

export const saveVapidKey = (key: string) => {
  localStorage.setItem('pb_fcm_vapid_key', key);
};

export const getNotificationSettings = (): NotificationSettings => {
  const saved = localStorage.getItem('pb_notification_settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return { kas: true, berita: true, jadwal: true };
};

export const saveNotificationSettings = (settings: NotificationSettings) => {
  localStorage.setItem('pb_notification_settings', JSON.stringify(settings));
};

// Initialize Firebase App
const getFirebaseAppInstance = () => {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }
  try {
    if (getApps().length === 0) {
      return initializeApp(config);
    } else {
      return getApp();
    }
  } catch (error) {
    console.error('Error initializing Firebase App:', error);
    return null;
  }
};

// Request Browser Notification Permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Browser ini tidak mendukung notifikasi.');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const app = getFirebaseAppInstance();
    if (!app) {
      console.warn('Firebase config tidak lengkap untuk mendapatkan token FCM.');
      return null;
    }

    const messaging = getMessaging(app);
    const vapidKey = getVapidKey();

    if (!vapidKey) {
      console.warn('VAPID Key tidak dikonfigurasi. Harap atur VAPID Key di pengaturan notifikasi.');
      return null;
    }

    // Register Service Worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey
    });

    if (token) {
      localStorage.setItem('pb_fcm_token', token);
      return token;
    } else {
      console.warn('Gagal mendapatkan token FCM (Token kosong).');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Setup foreground message handler
export const setupForegroundHandler = () => {
  const app = getFirebaseAppInstance();
  if (!app) return;

  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      const title = payload.notification?.title || 'PB Bilibili 162';
      const body = payload.notification?.body || 'Pemberitahuan baru!';

      // Trigger local alert / toast
      Swal.fire({
        title: `<div class="flex items-center gap-2 text-white font-black text-xs uppercase"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>${title}</div>`,
        text: body,
        position: 'top-end',
        showConfirmButton: false,
        timer: 6000,
        timerProgressBar: true,
        background: '#070d1a',
        color: '#fff',
        toast: true,
        customClass: {
          popup: 'border border-amber-500/20 rounded-2xl shadow-2xl p-3 max-w-[350px]',
          container: 'z-[9999999]'
        }
      });
    });
  } catch (error) {
    console.error('Error setting up foreground message handler:', error);
  }
};

// Dispatch a real push notification via our proxy backend server
export const triggerPushNotification = async (title: string, body: string, topic: 'kas' | 'berita' | 'jadwal') => {
  // Always trigger local notification in the current window instantly for full-fidelity real-time simulation
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico'
      });
    } catch (e) {
      // browser might block new Notification direct construction in iframe
    }
  }

  // Check if topic is enabled in settings
  const settings = getNotificationSettings();
  if (topic === 'kas' && !settings.kas) return;
  if (topic === 'berita' && !settings.berita) return;
  if (topic === 'jadwal' && !settings.jadwal) return;

  // Attempt to call backend express proxy endpoint to dispatch real FCM push message
  try {
    const response = await fetch('/api/send-push-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        topic,
        token: localStorage.getItem('pb_fcm_token') // Send to self device token
      })
    });
    
    const resData = await response.json();
    console.log('Push notification dispatch result:', resData);
  } catch (error) {
    console.warn('Error dispatching push notification via backend:', error);
  }
};
