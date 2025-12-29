// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Importamos estas funciones nuevas
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Importar Firestore
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC6RLnOyGDEwKCoWMrRwdRA-ZnUTQ7_G4g",
  authDomain: "recetas-app-a50fe.firebaseapp.com",
  databaseURL: "https://recetas-app-a50fe-default-rtdb.firebaseio.com",
  projectId: "recetas-app-a50fe",
  storageBucket: "recetas-app-a50fe.firebasestorage.app",
  messagingSenderId: "431804763680",
  appId: "1:431804763680:web:67a9f307a0774f8d7af645",
  measurementId: "G-6ZE506XE9K"
};

const app = initializeApp(firebaseConfig);

// 2. CAMBIO: En lugar de getAuth(app), usamos esto:
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);

export default function FirebaseConfig() { return null; }