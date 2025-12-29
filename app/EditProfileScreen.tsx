import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Firebase
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  
  // Recibimos los datos actuales desde la pantalla anterior
  const { userProfile } = route.params;

  // Estados inicializados con los datos actuales (o vacíos si no existen)
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [location, setLocation] = useState(userProfile.location || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  // La bio puede no existir aún, así que ponemos un string vacío por defecto
  const [bio, setBio] = useState(userProfile.bio || '');

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }

    setLoading(true);
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);

      // Actualizamos SOLO los campos que queremos cambiar
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        location: location.trim(),
        phone: phone.trim(),
        bio: bio.trim() // Aquí se guardará tu nueva descripción
      });

      Alert.alert("¡Éxito!", "Perfil actualizado correctamente ✅");
      navigation.goBack(); // Volvemos al perfil

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Editar Perfil ✏️</Text>
        
        <Text style={styles.label}>Nombre Mostrado</Text>
        <TextInput 
          style={styles.input} 
          value={displayName} 
          onChangeText={setDisplayName} 
          placeholder="Tu nombre o marca"
        />

        <Text style={styles.label}>Biografía / Sobre mí</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={bio} 
          onChangeText={setBio} 
          placeholder="Cuéntanos qué te gusta cocinar..."
          multiline={true} // Permite varias líneas
          numberOfLines={4}
        />

        <Text style={styles.label}>Ubicación</Text>
        <TextInput 
          style={styles.input} 
          value={location} 
          onChangeText={setLocation} 
          placeholder="Ciudad, País"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput 
          style={styles.input} 
          value={phone} 
          onChangeText={setPhone} 
          placeholder="+598..."
          keyboardType="phone-pad"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { 
    backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 8, 
    padding: 12, fontSize: 16, color: '#333' 
  },
  textArea: { height: 100, textAlignVertical: 'top' }, // Para que el texto empiece arriba
  
  saveButton: { 
    backgroundColor: '#FF6B00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  cancelButton: { marginTop: 15, alignItems: 'center' },
  cancelButtonText: { color: '#FF3B30', fontSize: 14 }
});