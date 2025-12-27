import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Alert } from "react-native";

// 1. Importaciones de Firebase
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';

import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {

    const navigation = useNavigation<any>();
    
    // Obtenemos el email de los parámetros (si existe)
    // Usamos el operador '?.' por seguridad, por si route.params viene vacío
    const email = auth.currentUser?.email || "Usuario";

    const handleLogout = () => {
        // 2. Ejecutamos la función de cerrar sesión de Firebase
        signOut(auth)
            .then(() => {
                // Si Firebase confirma que cerró sesión, entonces navegamos
                console.log("Sesión cerrada correctamente");
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'LoginScreen' }]
                });
            })
            .catch((error) => {
                Alert.alert("Error", "No se pudo cerrar sesión: " + error.message);
            });
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bienvenido al HomeScreen</Text>
            <Text style={styles.subtitle}>{email}</Text>

            <TouchableOpacity style={styles.button} onPress={handleLogout}>
                <Text style={styles.buttonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </View>
    )
}

// Agregué unos estilos rápidos para que se vea ordenado
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    subtitle: { fontSize: 18, color: '#666', marginBottom: 30 },
    button: { backgroundColor: '#FF3B30', padding: 15, borderRadius: 8 }, // Rojo para indicar "salir"
    buttonText: { color: 'white', fontWeight: 'bold' }
});