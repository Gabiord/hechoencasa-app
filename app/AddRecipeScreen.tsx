import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Usamos iconos para que se vea mejor

// 1. IMPORTACIONES DE IMAGEN Y STORAGE
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db, storage } from './firebaseConfig';

export default function AddRecipeScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados Principales
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null); // Guardamos la ruta local del celular
  const [category, setCategory] = useState('Almuerzo');
  
  // Listas Dinámicas
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [tempIngName, setTempIngName] = useState('');
  const [tempIngQty, setTempIngQty] = useState('');

  const [steps, setSteps] = useState<any[]>([]);
  const [tempStep, setTempStep] = useState('');

  // --- FUNCIÓN 1: ELEGIR FOTO ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Formato rectangular para comida
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // --- FUNCIÓN 2: SUBIR FOTO A STORAGE ---
  const uploadImageToStorage = async (localUri: string) => {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      // Creamos un nombre único usando la fecha actual
      const filename = `recipes/${auth.currentUser?.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error subiendo imagen:", error);
      throw error;
    }
  };

  // --- FUNCIONES DE INGREDIENTES Y PASOS (IGUAL QUE ANTES) ---
  const addIngredient = () => {
    if (!tempIngName.trim() || !tempIngQty.trim()) return;
    setIngredients([...ingredients, { id: Date.now().toString(), name: tempIngName.trim(), quantity: tempIngQty.trim() }]);
    setTempIngName(''); setTempIngQty('');
  };

  const removeIngredient = (id: string) => setIngredients(ingredients.filter(ing => ing.id !== id));

  const addStep = () => {
    if (!tempStep.trim()) return;
    const newStep = { step: (steps.length + 1).toString(), name: tempStep.trim() };
    setSteps([...steps, newStep]);
    setTempStep('');
  };

  const removeStep = (indexToRemove: number) => {
      const newSteps = steps.filter((_, index) => index !== indexToRemove);
      setSteps(newSteps.map((s, i) => ({ ...s, step: (i + 1).toString() })));
  };

  // --- GUARDAR TODO ---
  const handleSaveRecipe = async () => {
    if (!name || !imageUri || ingredients.length === 0 || steps.length === 0) {
      Alert.alert("Faltan datos", "Asegúrate de poner nombre, foto, ingredientes y pasos.");
      return;
    }

    setLoading(true);
    setUploading(true); // Para mostrar mensaje de "Subiendo foto..."

    try {
        const user = auth.currentUser;
        if (!user) return;

        // 1. PRIMERO SUBIMOS LA FOTO
        const finalPhotoURL = await uploadImageToStorage(imageUri);

        // 2. OBTENEMOS NOMBRE DEL CHEF
        let chefName = "Chef Anónimo";
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
             chefName = userDoc.data().displayName || chefName;
        }

        // 3. GUARDAMOS LA RECETA EN FIRESTORE
        const newRecipe = {
            name: name.trim(),
            image: { uri: finalPhotoURL }, // Usamos la URL de Firebase
            category: category,
            chef: chefName,
            creatorUid: user.uid,
            rate: "5",
            ingredients: ingredients,
            procedure: steps,
            createdAt: new Date()
        };

        await addDoc(collection(db, "recipes"), newRecipe);

        Alert.alert("¡Éxito! 🎉", "Tu receta se ha publicado correctamente.");
        navigation.goBack();

    } catch (error) {
        console.error(error);
        Alert.alert("Error", "Ocurrió un problema al subir la receta.");
    } finally {
        setLoading(false);
        setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nueva Receta 🥘</Text>

        {/* --- SECCIÓN DE FOTO --- */}
        <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="camera" size={40} color="#ccc" />
                        <Text style={styles.placeholderText}>Toca para subir foto</Text>
                    </View>
                )}
            </TouchableOpacity>
            {/* Si ya hay foto, permitimos cambiarla */}
            {imageUri && <Text style={styles.changePhotoText}>Toca la imagen para cambiarla</Text>}
        </View>

        {/* DATOS BÁSICOS */}
        <Text style={styles.sectionTitle}>Nombre del plato</Text>
        <TextInput style={styles.input} placeholder="Ej: Tarta de Manzana" value={name} onChangeText={setName} />
        
        <Text style={styles.sectionTitle}>Categoría</Text>
        <View style={styles.row}>
            {['Almuerzo', 'Cena', 'Postre'].map(cat => (
                <TouchableOpacity 
                    key={cat} 
                    style={[styles.catBadge, category === cat && styles.catBadgeSelected]}
                    onPress={() => setCategory(cat)}
                >
                    <Text style={[styles.catText, category === cat && styles.catTextSelected]}>{cat}</Text>
                </TouchableOpacity>
            ))}
        </View>

        {/* INGREDIENTES */}
        <Text style={styles.sectionTitle}>Ingredientes ({ingredients.length})</Text>
        <View style={styles.addSection}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Ingrediente" value={tempIngName} onChangeText={setTempIngName} />
            <TextInput style={[styles.input, { width: 80, marginRight: 5 }]} placeholder="Cant." value={tempIngQty} onChangeText={setTempIngQty} />
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
        </View>
        {ingredients.map((ing) => (
            <View key={ing.id} style={styles.listItem}>
                <Text style={{flex: 1}}>• {ing.quantity} {ing.name}</Text>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                    <Ionicons name="close-circle" size={20} color="red" />
                </TouchableOpacity>
            </View>
        ))}

        {/* PASOS */}
        <Text style={styles.sectionTitle}>Pasos ({steps.length})</Text>
        <View style={styles.addSection}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Describe el paso..." value={tempStep} onChangeText={setTempStep} />
            <TouchableOpacity style={styles.addButton} onPress={addStep}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
        </View>
        {steps.map((step, index) => (
            <View key={index} style={styles.listItem}>
                <Text style={{fontWeight: 'bold', color: '#FF6B00', marginRight: 5}}>{step.step}.</Text>
                <Text style={{flex: 1}}>{step.name}</Text>
                <TouchableOpacity onPress={() => removeStep(index)}>
                    <Ionicons name="close-circle" size={20} color="red" />
                </TouchableOpacity>
            </View>
        ))}

        {/* BOTÓN GUARDAR */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe} disabled={loading}>
            {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.saveButtonText}>{uploading ? "Subiendo Receta... ": "Guardando..."}</Text>
                </View>
            ) : (
                <Text style={styles.saveButtonText}>PUBLICAR RECETA 🚀</Text>
            )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#555' },
  
  // Estilos de Imagen
  imageSection: { alignItems: 'center', marginBottom: 10 },
  imagePicker: { 
      width: '100%', height: 200, backgroundColor: '#e1e1e1', borderRadius: 12, 
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed'
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#888', marginTop: 5, fontWeight: '600' },
  changePhotoText: { color: '#007AFF', fontSize: 12, marginTop: 5 },

  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#eee' },
  
  row: { flexDirection: 'row', marginBottom: 10 },
  catBadge: { padding: 8, backgroundColor: '#eee', borderRadius: 20, marginRight: 10 },
  catBadgeSelected: { backgroundColor: '#FF6B00' },
  catText: { color: '#666' },
  catTextSelected: { color: '#fff', fontWeight: 'bold' },

  addSection: { flexDirection: 'row', marginBottom: 10 },
  addButton: { backgroundColor: '#34C759', width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },

  listItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5, alignItems: 'center', elevation: 1 },

  saveButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});