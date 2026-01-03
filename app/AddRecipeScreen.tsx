import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; 

// Imágenes y Firebase
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore'; // Ya no necesitamos getDoc de usuario
import { auth, db, storage } from './firebaseConfig';

// Importamos la clave
import { GEMINI_API_KEY } from "../AIConfig";

export default function AddRecipeScreen() {
  const navigation = useNavigation<any>();
  
  // ESTADOS DE UI
  const [mode, setMode] = useState<'input' | 'preview'>('input'); // 'input' = Pegar texto, 'preview' = Ver resultado
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // INPUT INICIAL
  const [rawText, setRawText] = useState('');

  // DATOS DE LA RECETA (Resultado)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Almuerzo');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

// --- FUNCIÓN FINAL: USANDO GEMINI 1.5 FLASH (EL ESTÁNDAR GRATUITO) ⚡ ---
const generateRecipeWithAI = async () => {
  if (!rawText.trim()) {
    Alert.alert("Texto vacío", "Por favor pega la descripción de una receta.");
    return;
  }

  setAiLoading(true);

  try {
    console.log("Conectando con Gemini 1.5 Flash...");

    // CAMBIO AQUÍ: Usamos 'gemini-1.5-flash' que es el modelo gratuito por excelencia
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `
          Actúa como un asistente de cocina experto (API JSON).
          Tu tarea es convertir este texto desordenado en una receta JSON estructurada.
          
          Texto: "${rawText}"

          REGLAS OBLIGATORIAS:
          1. Devuelve SOLAMENTE un objeto JSON válido.
          2. NO uses bloques de código markdown (\`\`\`).
          3. Si faltan datos, infiérelos lógicamente.

          Estructura requerida:
          {
            "name": "Título del plato",
            "category": "Almuerzo",
            "ingredients": [{"name": "ingrediente", "quantity": "cantidad"}],
            "steps": [{"step": "1", "text": "instrucción"}]
          }
          *Categoría debe ser: Desayuno, Almuerzo, Cena, Postre o Snack.
        ` }] }] })
      }
    );

    const data = await response.json();

    // Validación de errores de Google
    if (data.error) {
        console.error("Error Google:", data.error);
        Alert.alert("Error de Google", `Código: ${data.error.code}\n${data.error.message}`);
        return;
    }

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      let aiText = data.candidates[0].content.parts[0].text;
      
      // Limpieza de seguridad
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
          const recipeJson = JSON.parse(aiText);
          
          setName(recipeJson.name || "Receta Importada");
          setCategory(recipeJson.category || 'Almuerzo');
          
          const cleanIngredients = (recipeJson.ingredients || []).map((ing: any, i: number) => ({
              name: ing.name, 
              quantity: ing.quantity || '', 
              id: i.toString()
          }));

          const cleanSteps = (recipeJson.steps || []).map((st: any, i: number) => ({
              name: st.text, 
              step: (i+1).toString()
          }));

          setIngredients(cleanIngredients);
          setSteps(cleanSteps);
          setMode('preview');

      } catch (jsonError) {
          console.error("Error JSON:", aiText);
          Alert.alert("Error de Formato", "La IA respondió pero falló el formato. Intenta de nuevo.");
      }

    } else {
      Alert.alert("Sin respuesta", "La IA no devolvió resultados.");
    }

  } catch (error: any) {
    console.error(error);
    Alert.alert("Error de Conexión", error.message);
  } finally {
    setAiLoading(false);
  }
};

  // --- 2. FUNCIÓN: GUARDAR EN PRIVADO 🔒 ---
  const handleSaveRecipe = async () => {
      setSaveLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
          let finalPhotoURL = "https://cdn-icons-png.flaticon.com/512/3565/3565418.png"; // Icono por defecto

          // Si el usuario subió foto, la guardamos
          if (imageUri) {
             const response = await fetch(imageUri);
             const blob = await response.blob();
             const filename = `recipes/${user.uid}_${Date.now()}.jpg`;
             const storageRef = ref(storage, filename);
             await uploadBytes(storageRef, blob);
             finalPhotoURL = await getDownloadURL(storageRef);
          }

          // Guardamos en la colección PRIVADA
          // users -> UID -> my_recipes
          const newRecipe = {
              name: name,
              image: { uri: finalPhotoURL },
              category: category,
              rate: "5",
              ingredients: ingredients,
              procedure: steps,
              createdAt: new Date()
          };

          await addDoc(collection(db, `users/${user.uid}/my_recipes`), newRecipe);

          Alert.alert("¡Guardado!", "Receta añadida a tu colección personal.");
          navigation.goBack();

      } catch (error) {
          console.error(error);
          Alert.alert("Error", "No se pudo guardar la receta.");
      } finally {
          setSaveLoading(false);
      }
  };

  // --- UI: ELEGIR FOTO ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // --- RENDERIZADO ---
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {mode === 'input' ? (
            // --- VISTA 1: IMPORTADOR ---
            <View>
                <Text style={styles.title}>Importar con IA ✨</Text>
                <Text style={styles.subtitle}>
                    Copia la descripción de un video de TikTok, Instagram o un blog, y pégala aquí. La IA hará el resto.
                </Text>

                <TextInput 
                    style={styles.textArea} 
                    multiline 
                    placeholder="Pega aquí el texto de la receta... Ej: 'Para hacer torta de chocolate necesitas 2 huevos...'"
                    value={rawText}
                    onChangeText={setRawText}
                    numberOfLines={8}
                    textAlignVertical="top"
                />

                <TouchableOpacity style={styles.aiButton} onPress={generateRecipeWithAI} disabled={aiLoading}>
                    {aiLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="sparkles" size={24} color="white" style={{marginRight: 10}} />
                            <Text style={styles.buttonText}>Analizar Receta</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        ) : (
            // --- VISTA 2: REVISIÓN ---
            <View>
                <Text style={styles.title}>Resultado 🍳</Text>
                
                {/* FOTO */}
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="camera" size={40} color="#FF6B00" />
                            <Text style={styles.placeholderText}>+ Añadir foto (Opcional)</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* EDITAR NOMBRE */}
                <Text style={styles.label}>Nombre:</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                {/* CATEGORÍA */}
                <Text style={styles.label}>Categoría detectada:</Text>
                <View style={styles.catBadge}>
                    <Text style={styles.catText}>{category}</Text>
                </View>

                {/* LISTAS */}
                <Text style={styles.label}>Ingredientes ({ingredients.length}):</Text>
                <View style={styles.listContainer}>
                    {ingredients.map((ing) => (
                        <Text key={ing.id} style={styles.listItem}>• {ing.quantity} {ing.name}</Text>
                    ))}
                </View>

                <Text style={styles.label}>Pasos ({steps.length}):</Text>
                <View style={styles.listContainer}>
                    {steps.map((st, i) => (
                        <Text key={i} style={styles.listItem}>{st.step}. {st.name}</Text>
                    ))}
                </View>

                <View style={styles.rowButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setMode('input')}>
                        <Text style={styles.cancelText}>Reintentar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe} disabled={saveLoading}>
                        {saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar en mi Libro</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 25, paddingBottom: 50 },
  
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  
  textArea: { 
      backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, height: 200, fontSize: 16, 
      borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 20 
  },
  aiButton: { 
      backgroundColor: '#8E44AD', padding: 18, borderRadius: 12, alignItems: 'center', 
      elevation: 4, shadowColor: '#8E44AD', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3 
  },

  // Estilos de Preview
  imagePicker: { 
      height: 180, backgroundColor: '#FFF5E6', borderRadius: 12, marginBottom: 20,
      justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#FF6B00' 
  },
  previewImage: { width: '100%', height: '100%', borderRadius: 10 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#FF6B00', fontWeight: 'bold', marginTop: 5 },

  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 5 },
  input: { fontSize: 18, borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 5, color: '#333' },
  
  catBadge: { alignSelf: 'flex-start', backgroundColor: '#eee', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  catText: { color: '#555', fontWeight: '600' },

  listContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10 },
  listItem: { fontSize: 14, color: '#444', marginBottom: 6, lineHeight: 20 },

  rowButtons: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  cancelButton: { padding: 15, flex: 1, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#FF6B00', flex: 2, padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});