import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

//FIREBASE
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

export default function LoginScreen() {

  const navigation = useNavigation<any>();

  // 1. Definición de estados para guardar los datos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Función que se ejecuta al presionar "Ingresar"
  const handleLogin = () => {
    // Validación simple
    if (email === '' || password === '') {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    //LÓGICA DE FIREBASE
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Si entra aquí, es que el usuario y contraseña son CORRECTOS
        console.log('Sesión iniciada!');
        const user = userCredential.user;

        // Navegamos enviando el email real
        navigation.navigate('MainTabs', {
          screen: 'Inicio',
          params: { email: user.email },
        });
      })
      .catch((error) => {
        // Si entra aquí, hubo un error (contraseña mal, usuario no existe, etc)
        console.log(error);
        Alert.alert('Error de acceso', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

      {/* Input de Email */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text) => setEmail(text)}
        />
      </View>

      {/* Input de Contraseña */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#666"
          secureTextEntry={true} // Esto oculta los caracteres
          value={password}
          onChangeText={(text) => setPassword(text)}
        />
      </View>

      {/* Botón de Ingresar */}
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Ingresar</Text>
      </TouchableOpacity>

      {/* Enlace de recuperación (decorativo por ahora) */}
      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.secondaryButton} 
        onPress={() => navigation.navigate('RegisterScreen')}
      >
        <Text style={styles.secondaryText}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>

    </View>
  );
}

// 3. Hoja de estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    elevation: 2, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    backgroundColor: '#007AFF', // Color azul estándar de iOS
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 20,
  },
  secondaryText: {
    color: '#007AFF',
    fontSize: 14,
  },
});