import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

//IMPORTACIONES FIREBASE
import { auth, db } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function RecipeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Recibimos la receta entera desde la pantalla anterior
  const { recipe } = route.params;

  // FUNCIÓN PARA GUARDAR
  const handleSaveRecipe = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      // Creamos una referencia: users -> (id usuario) -> saved_recipes -> (id receta)
      // Usamos 'setDoc' para que si le da dos veces, solo la sobrescriba y no la duplique
      const recipeRef = doc(db, 'users', userId, 'saved_recipes', recipe.uid || recipe.id.toString());

      await setDoc(recipeRef, recipe);

      Alert.alert("¡Listo!", "Receta agregada a tu lista de compras 🛒");
      navigation.goBack(); // Opcional: volver atrás al guardar
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo guardar la receta");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView>
        {/* Imagen Gigante */}
        <Image source={{ uri: recipe.image.uri }} style={styles.image} />

        {/* Botón flotante para volver atrás (opcional si usas header nativo) */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{recipe.name}</Text>
          <Text style={styles.subtitle}>Chef: {recipe.chef}</Text>

          {/* Sección de Ingredientes */}
          <Text style={styles.sectionTitle}>Ingredientes 🥕</Text>
          {recipe.ingredients.map((ing: any, index: number) => (
            <View key={index} style={styles.ingredientRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.ingredientText}>
                {ing.quantity} {ing.name}
              </Text>
            </View>
          ))}

          {/* Sección de Procedimiento */}
          <Text style={styles.sectionTitle}>Preparación 👩‍🍳</Text>
          {recipe.procedure.map((step: any, index: number) => (
            <View key={index} style={styles.stepContainer}>
              <Text style={styles.stepNumber}>{step.step}</Text>
              <Text style={styles.stepText}>{step.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Botón de Guardar Receta (Fijo abajo) */}
      <View style={styles.footer}>
        {/* 3. CONECTAMOS EL BOTÓN */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe}>
          <Text style={styles.saveButtonText}>Guardar y Agregar a Lista 🛒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 300 },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333' },

  // Ingredientes
  ingredientRow: { flexDirection: 'row', marginBottom: 5 },
  bullet: { fontSize: 18, color: '#FF6B00', marginRight: 10 },
  ingredientText: { fontSize: 16, color: '#444' },

  // Pasos
  stepContainer: { flexDirection: 'row', marginBottom: 15 },
  stepNumber: { fontWeight: 'bold', color: '#FF6B00', fontSize: 16, width: 30 },
  stepText: { flex: 1, fontSize: 16, color: '#444', lineHeight: 22 },

  // Footer
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});