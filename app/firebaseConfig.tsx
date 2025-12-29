// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Importamos estas funciones nuevas
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Importar Firestore
import { getFirestore } from "firebase/firestore";

//Storage
import { getStorage } from "firebase/storage"; // <--- 1. IMPORTAR ESTO

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyAiKxpqxQXvbUIkAcrVjyLFi-UkUwwJYhg",
  authDomain: "hechoencasa-app.firebaseapp.com",
  projectId: "hechoencasa-app",
  storageBucket: "hechoencasa-app.firebasestorage.app",
  messagingSenderId: "1074471091224",
  appId: "1:1074471091224:web:26f79f44a973de0897d76d"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);

export const storage = getStorage(app); 

export default function FirebaseConfig() { return null; }