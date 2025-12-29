import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Firebase
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function AddRecipeScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

  // 1. ESTADOS PRINCIPALES
  const [name, setName] = useState('');
  const [image, setImage] = useState(''); // Por ahora URL
  const [category, setCategory] = useState('Almuerzo');
  const [description, setDescription] = useState(''); // Opcional

  // 2. ESTADOS DINÁMICOS (Listas)
  // Ingredientes
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [tempIngName, setTempIngName] = useState('');
  const [tempIngQty, setTempIngQty] = useState('');

  // Pasos
  const [steps, setSteps] = useState<any[]>([]);
  const [tempStep, setTempStep] = useState('');

  // --- FUNCIONES DE INGREDIENTES ---
  const addIngredient = () => {
    if (!tempIngName.trim() || !tempIngQty.trim()) return;
    const newIng = {
      id: Date.now().toString(), // ID temporal único
      name: tempIngName.trim(),
      quantity: tempIngQty.trim() // Lo guardamos como string para flexibilidad ("2 tazas", "500g")
    };
    setIngredients([...ingredients, newIng]);
    setTempIngName('');
    setTempIngQty('');
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  // --- FUNCIONES DE PASOS ---
  const addStep = () => {
    if (!tempStep.trim()) return;
    const newStep = {
      step: (steps.length + 1).toString(),
      name: tempStep.trim()
    };
    setSteps([...steps, newStep]);
    setTempStep('');
  };

  const removeStep = (indexToRemove: number) => {
      // Al borrar, hay que recalcular los números de paso
      const newSteps = steps.filter((_, index) => index !== indexToRemove);
      // Re-numeramos
      const reorderedSteps = newSteps.map((s, i) => ({ ...s, step: (i + 1).toString() }));
      setSteps(reorderedSteps);
  };

  // --- GUARDAR EN FIREBASE ---
  const handleSaveRecipe = async () => {
    if (!name || !image || ingredients.length === 0 || steps.length === 0) {
      Alert.alert("Faltan datos", "Asegúrate de poner nombre, foto, ingredientes y pasos.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    try {
        // Obtenemos el nombre del chef desde su perfil para guardarlo en la receta
        let chefName = "Chef Anónimo";
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                chefName = userDoc.data().displayName || chefName;
            }
        }

        const newRecipe = {
            name: name.trim(),
            image: { uri: image.trim() }, // Estructura compatible con tu app
            category: category,
            chef: chefName,          // Nombre visible
            creatorUid: user?.uid,   // 👈 LA CLAVE: ID invisible para el perfil
            rate: "5",               // Inicializamos con 5 estrellas
            ingredients: ingredients,
            procedure: steps,
            createdAt: new Date()
        };

        // Guardamos en la colección general "recipes"
        await addDoc(collection(db, "recipes"), newRecipe);

        Alert.alert("¡Receta Publicada! 👨‍🍳", "Ya aparece en el inicio y en tu perfil.");
        navigation.goBack(); // Volver

    } catch (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo subir la receta.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Nueva Receta 🥘</Text>

        {/* --- DATOS BÁSICOS --- */}
        <Text style={styles.sectionTitle}>Datos Principales</Text>
        <TextInput style={styles.input} placeholder="Nombre del plato (Ej: Tarta de Manzana)" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="URL de la Foto (https://...)" value={image} onChangeText={setImage} />
        
        {/* Selector de Categoría simple */}
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

        {/* --- INGREDIENTES --- */}
        <Text style={styles.sectionTitle}>Ingredientes ({ingredients.length})</Text>
        <View style={styles.addSection}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Ingrediente (ej: Harina)" value={tempIngName} onChangeText={setTempIngName} />
            <TextInput style={[styles.input, { width: 80, marginRight: 5 }]} placeholder="Cant." value={tempIngQty} onChangeText={setTempIngQty} />
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
        </View>
        {/* Lista visual de ingredientes agregados */}
        {ingredients.map((ing) => (
            <View key={ing.id} style={styles.listItem}>
                <Text style={{flex: 1}}>• {ing.quantity} {ing.name}</Text>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                    <Text style={styles.removeText}>X</Text>
                </TouchableOpacity>
            </View>
        ))}

        {/* --- PASOS --- */}
        <Text style={styles.sectionTitle}>Pasos de Preparación ({steps.length})</Text>
        <View style={styles.addSection}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 5 }]} placeholder="Describe el paso..." value={tempStep} onChangeText={setTempStep} />
            <TouchableOpacity style={styles.addButton} onPress={addStep}>
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
        </View>
        {steps.map((step, index) => (
            <View key={index} style={styles.listItem}>
                <Text style={{fontWeight: 'bold', color: '#FF6B00', marginRight: 5}}>{step.step}.</Text>
                <Text style={{flex: 1}}>{step.name}</Text>
                <TouchableOpacity onPress={() => removeStep(index)}>
                    <Text style={styles.removeText}>X</Text>
                </TouchableOpacity>
            </View>
        ))}

        {/* --- BOTÓN GUARDAR --- */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>PUBLICAR RECETA 🚀</Text>}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#555' },
  
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  
  // Categorías
  row: { flexDirection: 'row', marginBottom: 10 },
  catBadge: { padding: 8, backgroundColor: '#eee', borderRadius: 20, marginRight: 10 },
  catBadgeSelected: { backgroundColor: '#FF6B00' },
  catText: { color: '#666' },
  catTextSelected: { color: '#fff', fontWeight: 'bold' },

  // Sección de agregar (fila)
  addSection: { flexDirection: 'row', marginBottom: 10 },
  addButton: { backgroundColor: '#34C759', width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  // Item de lista
  listItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 5, alignItems: 'center', elevation: 1 },
  removeText: { color: 'red', fontWeight: 'bold', paddingHorizontal: 10 },

  // Botón Principal
  saveButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});