import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker'; // <--- LIBRERÍA DE IMÁGENES

// Firebase
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // <--- IMPORTACIONES DE STORAGE
import { auth, db, storage } from './firebaseConfig';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { userProfile } = route.params;

  // Estados
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [location, setLocation] = useState(userProfile.location || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [bio, setBio] = useState(userProfile.bio || '');
  const [photoURL, setPhotoURL] = useState(userProfile.photoURL || '');
  
  // Estado para saber si estamos subiendo la foto (diferente a guardando el perfil)
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. FUNCIÓN PARA ABRIR GALERÍA
  const pickImage = async () => {
    // Pedimos permiso
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Cuadrado perfecto para perfil
      quality: 0.5,   // Calidad media para ahorrar datos
    });

    if (!result.canceled) {
      // Si el usuario eligió una foto, la subimos inmediatamente
      await uploadImage(result.assets[0].uri);
    }
  };

  // 2. FUNCIÓN PARA SUBIR A FIREBASE STORAGE
  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      // A. Convertir la imagen a "Blob" (archivo binario)
      const response = await fetch(uri);
      const blob = await response.blob();

      // B. Crear una referencia en Storage (Donde se guardará)
      // Carpeta: profile_pictures / nombre_del_archivo
      const filename = auth.currentUser?.uid + "_profile.jpg";
      const storageRef = ref(storage, `profile_pictures/${filename}`);

      // C. Subir el archivo
      await uploadBytes(storageRef, blob);

      // D. Obtener la URL de descarga pública
      const downloadURL = await getDownloadURL(storageRef);
      
      // E. Actualizar el estado visual
      setPhotoURL(downloadURL);
      Alert.alert("Foto subida", "Tu foto se cargó correctamente. No olvides dar a 'Guardar Cambios'.");

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        location: location.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        photoURL: photoURL // Guardamos la URL que obtuvimos de Storage
      });
      Alert.alert("¡Éxito!", "Perfil actualizado ✅");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Editar Perfil ✏️</Text>
        
        {/* ZONA DE FOTO */}
        <View style={{alignItems: 'center', marginBottom: 20}}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
                <Image 
                    source={{ uri: photoURL || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
                    style={styles.previewImage}
                />
                {/* Overlay de carga si se está subiendo */}
                {uploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Toca la foto para cambiarla 📸</Text>
        </View>

        <Text style={styles.label}>Nombre Mostrado</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />

        <Text style={styles.label}>Biografía</Text>
        <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={4} />

        <Text style={styles.label}>Ubicación</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading || uploading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
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
  
  // Estilos de Foto
  previewImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#eee' },
  uploadingOverlay: { 
      position: 'absolute', width: 120, height: 120, borderRadius: 60, 
      backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' 
  },
  photoHint: { color: '#007AFF', marginTop: 10, fontWeight: '600' },

  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { marginTop: 15, alignItems: 'center' },
  cancelButtonText: { color: '#FF3B30', fontSize: 14 }
});