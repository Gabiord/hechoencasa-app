import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity, Alert
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

// 1. Importamos la función para CREAR usuarios
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";

export default function RegisterScreen() {

    const navigation = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = () => {
        if (email === '' || password === '') {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        // 2. Creamos el usuario en Firebase
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Si funciona, Firebase loguea al usuario automáticamente
                const user = userCredential.user;
                Alert.alert('¡Cuenta creada!', `Bienvenido ${user.email}`);

                // Navegamos directamente a la app
                navigation.navigate('MainTabs', {
                    screen: 'Inicio',
                    params: { email: user.email },
                });
            })
            .catch((error) => {
                // Manejo de errores comunes
                let mensaje = error.message;
                if (error.code === 'auth/email-already-in-use') mensaje = "Ese correo ya está registrado.";
                if (error.code === 'auth/weak-password') mensaje = "La contraseña debe tener al menos 6 caracteres.";

                Alert.alert('Error de registro', mensaje);
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Únete para guardar tus recetas</Text>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    placeholderTextColor="#666"
                    secureTextEntry={true}
                    value={password}
                    onChangeText={setPassword}
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Registrarse</Text>
            </TouchableOpacity>

            {/* Botón para volver al Login si ya tiene cuenta */}
            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('LoginScreen')}
            >
                <Text style={styles.secondaryText}>¿Ya tienes cuenta? Ingresa aquí</Text>
            </TouchableOpacity>
        </View>
    );
}

// Usamos los mismos estilos del Login para mantener consistencia
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', padding: 20 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
    inputContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, paddingHorizontal: 15, elevation: 2 },
    input: { height: 50, fontSize: 16, color: '#333' },
    button: { width: '100%', backgroundColor: '#34C759', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 }, // Botón Verde para diferenciarlo
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    secondaryButton: { marginTop: 20 },
    secondaryText: { color: '#007AFF', fontSize: 14 },
});