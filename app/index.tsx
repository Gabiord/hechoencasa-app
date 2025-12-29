import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth'; // Importamos User
import { auth } from './firebaseConfig';

//Importamos Pantallas
import LoginScreen from './LoginScreen';
import MainTabs from './MainTabs';
import RegisterScreen from './RegisterScreen';
import RecipeDetailScreen from './RecipeDetailScreen';
import EditProfileScreen from './EditProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null); // <--- OJO AQUÍ

  // ESTE ES EL SENSOR QUE DETECTA SI YA ESTAMOS LOGUEADOS
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (usuarioDetectado) => {
      setUser(usuarioDetectado);
      if (initializing) setInitializing(false);
    });
    return subscriber;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      // 👇 ESTA LÍNEA ES CRUCIAL:
      initialRouteName={user ? "MainTabs" : "LoginScreen"}
    >
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />

      {/* Si hay usuario, entra aquí directo */}
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="RecipeDetailScreen" component={RecipeDetailScreen} />
      <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />

    </Stack.Navigator>
  );
}