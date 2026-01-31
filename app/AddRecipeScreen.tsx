import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, LogBox
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; 

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db, storage } from './firebaseConfig';
import { GEMINI_API_KEY } from '../AIConfig';

export default function AddRecipeScreen() {
  const navigation = useNavigation<any>();
  
  // 1. SOLICITAR PERMISOS DE GALERÍA
  const [permissionStatus, requestPermission] = ImagePicker.useMediaLibraryPermissions();

  // --- SILENCIADOR DE ADVERTENCIAS ---
  useEffect(() => {
    LogBox.ignoreLogs([
        'Method readAsStringAsync imported from', // Silencia error de FileSystem
        'ImagePicker.MediaTypeOptions',           // Silencia error de ImagePicker
    ]);
  }, []);

  const [mode, setMode] = useState<'input' | 'preview'>('input'); 
  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [rawText, setRawText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Almuerzo');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // --- SELECCIONAR VIDEO O FOTO 🎥 ---
  const pickMediaForAnalysis = async () => {
    // Verificar Permisos
    if (!permissionStatus?.granted) {
        const permissionResponse = await requestPermission();
        if (!permissionResponse.granted) {
            Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería.");
            return;
        }
    }

    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            // 👇 VOLVEMOS A LA VERSIÓN QUE FUNCIONA (MediaTypeOptions)
            mediaTypes: ImagePicker.MediaTypeOptions.All, 
            allowsEditing: true,
            quality: 0.5,
            videoMaxDuration: 60,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setSelectedMedia(asset);
            
            if (asset.type === 'video') {
                Alert.alert("Video cargado", "El análisis puede tardar un poco más. ¡Paciencia! 🍿");
            }
        }
    } catch (error) {
        console.error("Error al abrir galería:", error);
        Alert.alert("Error", "No pudimos abrir la galería.");
    }
  };

  // --- CEREBRO IA 🧠 ---
  const generateRecipeWithAI = async () => {
    if (!rawText.trim() && !selectedMedia) {
      Alert.alert("Falta información", "Por favor ingresa texto o selecciona un video/foto.");
      return;
    }

    setAiLoading(true);

    try {
      let contentParts: any[] = [];

      const jsonSchemaInstruction = `
        CRITICAL OUTPUT RULES:
        1. Return ONLY valid JSON. No conversational text.
        2. Use EXACTLY these keys: "name", "category", "ingredients", "steps".
        3. FLATTEN the recipe. Merge all ingredients into one single "ingredients" array.
        4. Convert quantities to METRIC (g, ml, kg, L, ud).
        
        REQUIRED JSON STRUCTURE:
        {
          "name": "Recipe Title",
          "category": "Almuerzo",
          "ingredients": [
            { "name": "Ingredient Name", "quantity": "100 g" }
          ],
          "steps": [
            { "step": "1", "text": "Step description..." }
          ]
        }
      `;

      if (rawText.trim()) {
        contentParts.push({ text: `ROLE: Strict JSON Parser. INPUT TEXT: "${rawText}" ${jsonSchemaInstruction}`});
      }

      if (selectedMedia) {
          try {
              const base64Data = await FileSystem.readAsStringAsync(selectedMedia.uri, {
                  encoding: 'base64'
              });
              const mimeType = selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg';
              
              contentParts.push({ text: `Analyze visual & audio. Extract recipe. ${jsonSchemaInstruction}` });
              contentParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
          } catch (readError) {
              throw new Error("Error leyendo el archivo de video.");
          }
      }

      console.log("Enviando a Gemini...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: contentParts }] })
        }
      );

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      if (data.candidates && data.candidates[0].content) {
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Limpieza JSON
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '');
        const firstBracket = aiText.indexOf('{');
        const lastBracket = aiText.lastIndexOf('}');

        if (firstBracket === -1 || lastBracket === -1) {
            throw new Error("La IA no devolvió un JSON válido.");
        }

        const cleanJsonString = aiText.substring(firstBracket, lastBracket + 1);

        try {
            const recipeJson = JSON.parse(cleanJsonString);
            
            const finalName = recipeJson.name || recipeJson.nombre || "Receta Detectada";
            const finalCategory = recipeJson.category || recipeJson.categoria || 'Almuerzo';
            
            let finalIngredients: any[] = [];
            
            if (Array.isArray(recipeJson.ingredients)) finalIngredients = recipeJson.ingredients;
            else if (Array.isArray(recipeJson.ingredientes)) finalIngredients = recipeJson.ingredientes;
            else {
                 Object.values(recipeJson).forEach((val: any) => {
                    if (Array.isArray(val)) finalIngredients = [...finalIngredients, ...val];
                });
            }

            let finalSteps: any[] = [];
            
            if (Array.isArray(recipeJson.steps)) finalSteps = recipeJson.steps;
            else if (Array.isArray(recipeJson.pasos) || Array.isArray(recipeJson.instrucciones)) finalSteps = recipeJson.pasos || recipeJson.instrucciones;

            setName(finalName);
            setCategory(finalCategory);
            
            setIngredients(finalIngredients.map((ing:any, i:number) => ({ 
                name: ing.name || ing.nombre || "Ingrediente", 
                quantity: ing.quantity || ing.cantidad || "", 
                id: i.toString() 
            })));

            setSteps(finalSteps.map((st:any, i:number) => ({ 
                name: st.text || st.descripcion || st, 
                step: (i+1).toString() 
            })));

            if (selectedMedia && !imageUri) setImageUri(selectedMedia.uri);
            setMode('preview');
            setSelectedMedia(null);
            setRawText('');

        } catch (parseError) {
            console.error("JSON Roto:", cleanJsonString);
            throw new Error("Error de formato en la respuesta de la IA.");
        }

      } else {
        throw new Error("Sin respuesta de IA.");
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert("Atención", error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveRecipe = async () => {
      setSaveLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      try {
          let finalPhotoURL = "https://cdn-icons-png.flaticon.com/512/3565/3565418.png";

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

          Alert.alert("¡Éxito!", "Receta guardada.");
          navigation.goBack();

      } catch (error) {
          Alert.alert("Error", "No se pudo guardar.");
      } finally {
          setSaveLoading(false);
      }
  };

  const pickCoverImage = async () => {
    if (!permissionStatus?.granted) {
        const permissionResponse = await requestPermission();
        if (!permissionResponse.granted) return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      // 👇 TAMBIÉN AQUÍ: MediaTypeOptions
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {mode === 'input' ? (
            <View>
                <Text style={styles.title}>IA Chef 🧑‍🍳</Text>
                <Text style={styles.subtitle}>Opción A: Link o Texto</Text>

                <TextInput 
                    style={styles.textArea} multiline 
                    placeholder="https://... o 'Harina, huevos...'"
                    value={rawText} onChangeText={setRawText}
                    numberOfLines={4} textAlignVertical="top"
                />

                <Text style={styles.subtitle}>Opción B: Video o Foto</Text>
                
                <TouchableOpacity style={styles.mediaButton} onPress={pickMediaForAnalysis}>
                    {selectedMedia ? (
                        <View style={{alignItems: 'center'}}>
                            <Ionicons name="checkmark-circle" size={40} color="#34C759" />
                            <Text style={styles.mediaText}>Archivo listo ({selectedMedia.type})</Text>
                        </View>
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <Ionicons name="videocam-outline" size={40} color="#666" />
                            <Text style={styles.mediaText}>Toca para elegir</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.aiButton} onPress={generateRecipeWithAI} disabled={aiLoading}>
                    {aiLoading ? (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <ActivityIndicator color="#fff" style={{marginRight: 10}}/>
                            <Text style={styles.buttonText}>Analizando...</Text>
                        </View>
                    ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="sparkles" size={24} color="white" style={{marginRight: 10}} />
                            <Text style={styles.buttonText}>Generar Receta</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        ) : (
            <View>
                <Text style={styles.title}>Resultado ✨</Text>
                <TouchableOpacity onPress={pickCoverImage} style={styles.imagePicker}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="camera" size={40} color="#FF6B00" />
                            <Text style={styles.placeholderText}>+ Portada</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TextInput style={styles.input} value={name} onChangeText={setName} />
                <TextInput style={styles.input} value={category} onChangeText={setCategory} />
                <Text style={styles.label}>Ingredientes:</Text>
                <View style={styles.listContainer}>
                    {ingredients.map((ing) => (<Text key={ing.id} style={styles.listItem}>• {ing.quantity} {ing.name}</Text>))}
                </View>
                <Text style={styles.label}>Pasos:</Text>
                <View style={styles.listContainer}>
                    {steps.map((st, i) => (<Text key={i} style={styles.listItem}>{st.step}. {st.name}</Text>))}
                </View>
                <View style={styles.rowButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => { setMode('input'); setSelectedMedia(null); }}><Text style={styles.cancelText}>Reintentar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe} disabled={saveLoading}>{saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}</TouchableOpacity>
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
  subtitle: { fontSize: 14, color: '#666', fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  textArea: { backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, height: 100, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  mediaButton: { height: 120, backgroundColor: '#F0F8FF', borderRadius: 15, borderStyle: 'dashed', borderWidth: 2, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  mediaText: { color: '#007AFF', fontWeight: '600', marginTop: 5 },
  aiButton: { backgroundColor: '#8E44AD', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4, marginTop: 10 },
  imagePicker: { height: 180, backgroundColor: '#FFF5E6', borderRadius: 12, marginBottom: 20, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#FF6B00' },
  previewImage: { width: '100%', height: '100%', borderRadius: 10 },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#FF6B00', fontWeight: 'bold', marginTop: 5 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 5 },
  input: { fontSize: 18, borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 5, color: '#333', marginBottom: 10 },
  listContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10 },
  listItem: { fontSize: 14, color: '#444', marginBottom: 6 },
  rowButtons: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  cancelButton: { padding: 15, flex: 1, alignItems: 'center' },
  cancelText: { color: '#666', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#FF6B00', flex: 2, padding: 15, borderRadius: 12, alignItems: 'center', marginLeft: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});