import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importamos tus pantallas
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import MainTabs from './MainTabs';

// Importamos Firebase
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Este efecto se ejecuta una sola vez al abrir la app
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (usuarioDetectado) => {
      setUser(usuarioDetectado); // Guardamos al usuario (o null si no hay)
      if (initializing) setInitializing(false); // Ya terminamos de cargar
    });
    return subscriber; // Limpieza al cerrar
  }, []);

  // Mientras verificamos la sesión, mostramos un cargando...
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Una vez verificado, decidimos qué pantalla mostrar primero
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      // AQUÍ ESTÁ LA MAGIA: Si hay usuario, vamos a MainTabs; si no, al Login.
      initialRouteName={user ? "MainTabs" : "LoginScreen"}
    >
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}