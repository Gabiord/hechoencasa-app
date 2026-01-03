import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Clipboard 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; 

import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db, storage } from './firebaseConfig';
import { GEMINI_API_KEY } from '../AIConfig';

export default function AddRecipeScreen() {
  const navigation = useNavigation<any>();
  
  const [mode, setMode] = useState<'input' | 'preview'>('input'); 
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [rawText, setRawText] = useState('');

  // Estados de Receta
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Almuerzo');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // --- FUNCIÓN IA: EL CEREBRO TODOTERRENO 🧠🔗 ---
  const generateRecipeWithAI = async () => {
    if (!rawText.trim()) {
      Alert.alert("Input vacío", "Pega un link o el texto de una receta.");
      return;
    }

    setAiLoading(true);

    try {
      // Usamos Gemini 2.0 Flash (o 1.5-flash si prefieres)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `
            Actúa como un Chef y Experto en Datos.
            Analiza el siguiente INPUT (puede ser un Texto desordenado O un Enlace/URL).

            INPUT DEL USUARIO: "${rawText}"

            TAREAS:
            1. Si es un LINK (Instagram, TikTok, Blog): Intenta extraer la receta del contexto del enlace.
            2. Si es TEXTO: Estructura la información.
            
            REGLAS CRÍTICAS DE SALIDA:
            - Convierte cantidades a SISTEMA MÉTRICO (g, kg, ml, L, ud) siempre que sea posible. Evita "tazas" o "cucharadas" si puedes estimar los gramos.
            - Responde SOLAMENTE con un JSON válido. Sin markdown (\`\`\`).
            
            ESTRUCTURA JSON:
            {
              "name": "Título de la Receta",
              "category": "Una de: Desayuno, Almuerzo, Cena, Postre, Snack",
              "ingredients": [
                {"name": "Ingrediente (ej: Harina)", "quantity": "Cantidad (ej: 500 g)"}
              ],
              "steps": [{"step": "1", "text": "Instrucción clara"}]
            }
          ` }] }] })
        }
      );

      const data = await response.json();

      if (data.error) {
          Alert.alert("Error de Google", data.error.message);
          return;
      }

      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Limpieza de JSON (substring para quitar basura antes y después)
        const jsonStartIndex = aiText.indexOf('{');
        const jsonEndIndex = aiText.lastIndexOf('}');

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
            aiText = aiText.substring(jsonStartIndex, jsonEndIndex + 1);
        }

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
            setMode('preview'); // Pasamos a la vista de confirmación

        } catch (jsonError) {
            console.error("Error JSON:", aiText);
            Alert.alert("Lo siento", "Pude leer el enlace/texto pero no pude estructurar la receta. Intenta copiar solo los ingredientes y pasos.");
        }
      } else {
        Alert.alert("Sin respuesta", "La IA no pudo procesar esa solicitud.");
      }

    } catch (error: any) {
      Alert.alert("Error de Conexión", error.message);
    } finally {
      setAiLoading(false);
    }
  };

  // --- GUARDAR EN FIRESTORE (IGUAL QUE ANTES) ---
  const handleSaveRecipe = async () => {
      setSaveLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
          let finalPhotoURL = "https://cdn-icons-png.flaticon.com/512/3565/3565418.png"; // Placeholder default

          if (imageUri) {
             const response = await fetch(imageUri);
             const blob = await response.blob();
             const filename = `recipes/${user.uid}_${Date.now()}.jpg`;
             const storageRef = ref(storage, filename);
             await uploadBytes(storageRef, blob);
             finalPhotoURL = await getDownloadURL(storageRef);
          }

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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {mode === 'input' ? (
            <View>
                <Text style={styles.title}>Importar Receta 🌐</Text>
                <Text style={styles.subtitle}>
                    Pega un enlace (TikTok, Instagram, Web) o el texto de los ingredientes.
                </Text>

                <TextInput 
                    style={styles.textArea} 
                    multiline 
                    placeholder="Ej: https://instagram.com/p/receta... o '2 huevos, harina...'"
                    value={rawText}
                    onChangeText={setRawText}
                    numberOfLines={6}
                    textAlignVertical="top"
                />

                <TouchableOpacity style={styles.aiButton} onPress={generateRecipeWithAI} disabled={aiLoading}>
                    {aiLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="sparkles" size={24} color="white" style={{marginRight: 10}} />
                            <Text style={styles.buttonText}>Analizar con IA</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        ) : (
            <View>
                <Text style={styles.title}>Resultado 🍳</Text>
                
                <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="camera" size={40} color="#FF6B00" />
                            <Text style={styles.placeholderText}>+ Añadir foto</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={styles.label}>Nombre:</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                <Text style={styles.label}>Categoría:</Text>
                <TextInput style={styles.input} value={category} onChangeText={setCategory} />

                <Text style={styles.label}>Ingredientes:</Text>
                <View style={styles.listContainer}>
                    {ingredients.map((ing) => (
                        <Text key={ing.id} style={styles.listItem}>• {ing.quantity} {ing.name}</Text>
                    ))}
                </View>

                <Text style={styles.label}>Pasos:</Text>
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
                        {saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}
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
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  textArea: { backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, height: 150, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 20 },
  aiButton: { backgroundColor: '#8E44AD', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4 },
  imagePicker: { height: 180, backgroundColor: '#FFF5E6', borderRadius: 12, marginBottom: 20, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#FF6B00' },
  previewImage: { width: '100%', height: '100%', borderRadius: 10 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#FF6B00', fontWeight: 'bold', marginTop: 5 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 5 },
  input: { fontSize: 18, borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 5, color: '#333' },
  listContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10 },
  listItem: { fontSize: 14, color: '#444', marginBottom: 6 },
  rowButtons: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  cancelButton: { padding: 15, flex: 1, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#FF6B00', flex: 2, padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});