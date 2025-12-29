import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// FIREBASE
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

export default function RegisterScreen() {
    const navigation = useNavigation<any>();

    // ESTADOS
    const [loading, setLoading] = useState(false);
    
    // Datos Personales
    const [displayName, setDisplayName] = useState(''); 
    const [username, setUsername] = useState('');       
    const [accountType, setAccountType] = useState('Foodie'); 
    const [localidad, setLocalidad] = useState('');
    const [telefono, setTelefono] = useState('');
    
    // Credenciales
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const accountTypes = ["Foodie", "Chef", "ONG", "Empresa", "Nutricionista"];

    // Función auxiliar para validar formato de email
    const isValidEmail = (email: string) => {
        // Esta expresión regular verifica: texto + @ + texto + . + texto
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const checkUsernameUnique = async (userToCheck: string) => {
        const q = query(collection(db, "users"), where("username", "==", userToCheck));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty; 
    };

    const handleRegister = async () => {
        // 1. Validaciones Básicas de campos vacíos
        if (!displayName || !username || !localidad || !email || !password) {
            Alert.alert('Faltan datos', 'Por favor completa los campos obligatorios (*)');
            return;
        }

        // LIMPIEZA DE DATOS (Trim quita espacios al inicio y final)
        const cleanEmail = email.trim();
        const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '_');

        // 2. NUEVA VALIDACIÓN: Formato de Email
        if (!isValidEmail(cleanEmail)) {
            Alert.alert('Correo inválido', 'El formato del correo no es correcto. \nEjemplo: hola@cocina.com');
            return;
        }

        setLoading(true);

        try {
            // 3. Validación: ¿El usuario ya existe?
            const isUnique = await checkUsernameUnique(cleanUsername);
            if (!isUnique) {
                Alert.alert("Usuario no disponible", `El usuario @${cleanUsername} ya está en uso. Prueba con otro.`);
                setLoading(false);
                return;
            }

            // 4. Crear cuenta en Auth
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const user = userCredential.user;

            // 5. Guardar Perfil en Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: displayName.trim(),
                username: cleanUsername,
                accountType: accountType,
                location: localidad.trim(),
                phone: telefono.trim(),
                email: cleanEmail,
                createdAt: new Date(),
                photoURL: null 
            });

            Alert.alert('¡Bienvenido!', `Cuenta creada para @${cleanUsername}`);
            navigation.navigate('MainTabs', { screen: 'Inicio' });

        } catch (error: any) {
            console.error(error);
            let mensaje = "Hubo un error al registrarse.";
            
            if (error.code === 'auth/email-already-in-use') mensaje = "Este correo electrónico ya está registrado.";
            if (error.code === 'auth/weak-password') mensaje = "La contraseña es muy débil (mínimo 6 caracteres).";
            if (error.code === 'auth/invalid-email') mensaje = "El formato del correo no es válido.";

            Alert.alert('Error', mensaje);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Crear Cuenta</Text>
                <Text style={styles.subtitle}>Únete a nuestra comunidad culinaria</Text>

                {/* IDENTIDAD */}
                <Text style={styles.sectionLabel}>Identidad</Text>
                
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Nombre Mostrado * (Ej: Juan o Fundación X)" 
                        value={displayName} 
                        onChangeText={setDisplayName} 
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.prefix}>@</Text>
                    <TextInput 
                        style={[styles.input, { flex: 1 }]} 
                        placeholder="Usuario Único * (Ej: juan_cocina)" 
                        value={username} 
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>

                {/* TIPO DE CUENTA */}
                <Text style={styles.sectionLabel}>¿Qué eres?</Text>
                <View style={styles.chipsContainer}>
                    {accountTypes.map((type) => (
                        <TouchableOpacity 
                            key={type}
                            style={[styles.chip, accountType === type && styles.chipSelected]}
                            onPress={() => setAccountType(type)}
                        >
                            <Text style={[styles.chipText, accountType === type && styles.chipTextSelected]}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* DETALLES */}
                <Text style={styles.sectionLabel}>Detalles</Text>
                <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="Localidad / Ciudad *" value={localidad} onChangeText={setLocalidad} />
                </View>
                <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="Teléfono / WhatsApp" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
                </View>

                {/* CREDENCIALES */}
                <Text style={styles.sectionLabel}>Credenciales</Text>
                <View style={styles.inputContainer}>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Correo electrónico *" 
                        keyboardType="email-address" 
                        autoCapitalize="none" 
                        value={email} 
                        onChangeText={setEmail} 
                    />
                </View>
                <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholder="Contraseña *" secureTextEntry={true} value={password} onChangeText={setPassword} />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarse</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('LoginScreen')}>
                    <Text style={styles.secondaryText}>¿Ya tienes cuenta? Ingresa aquí</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f9f9f9' },
    scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 50 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
    sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#888', marginTop: 15, marginBottom: 8, textTransform: 'uppercase' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#888', borderRadius: 8, marginBottom: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#eee' },
    input: { height: 50, fontSize: 16, color: '#333', width: '100%' },
    prefix: { fontSize: 16, color: '#888', marginRight: 5, fontWeight: 'bold' },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eee', marginRight: 10, marginBottom: 10 },
    chipSelected: { backgroundColor: '#FF6B00' },
    chipText: { color: '#666', fontWeight: '600' },
    chipTextSelected: { color: '#fff' },
    button: { width: '100%', backgroundColor: '#FF6B00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    secondaryButton: { marginTop: 20, alignItems: 'center' },
    secondaryText: { color: '#007AFF', fontSize: 14 },
});