import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { doc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function RecipeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { recipe } = route.params;

  // Detectamos el ID correctamente (venga del Home o del Perfil)
  const recipeId = recipe.id || recipe.uid;
  
  const [loading, setLoading] = useState(false);

  // --- FUNCIÓN 1: ELIMINAR RECETA 🗑️ ---
  const handleDeleteRecipe = () => {
    Alert.alert(
      "Eliminar Receta",
      "¿Estás seguro de que quieres borrar esta receta de tu libro personal? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              const user = auth.currentUser;
              if (!user || !recipeId) return;

              // Borramos de la colección privada
              await deleteDoc(doc(db, `users/${user.uid}/my_recipes`, recipeId));
              
              navigation.goBack(); // Regresamos
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "No se pudo eliminar la receta.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- FUNCIÓN 2: AÑADIR A LISTA DE COMPRAS 🛒 ---
  const handleAddToShoppingList = async () => {
    Alert.alert(
      "Lista de Compras",
      "¿Quieres añadir todos los ingredientes a tu lista de compras?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Añadir",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              // Iteramos y guardamos cada ingrediente en la lista de compras privada
              const shoppingListRef = collection(db, `users/${user.uid}/shopping_list`);
              
              const promises = recipe.ingredients.map((ing: any) => {
                return addDoc(shoppingListRef, {
                  name: ing.name,
                  quantity: ing.quantity,
                  checked: false, // Para que aparezcan desmarcados
                  recipeName: recipe.name // Para saber de qué receta vino
                });
              });

              await Promise.all(promises);
              
              Alert.alert("¡Listo! ✅", "Ingredientes añadidos a tu lista de compras.");
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "No se pudieron añadir los ingredientes.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* IMAGEN DE PORTADA */}
        <Image 
            source={{ uri: recipe.image?.uri || 'https://via.placeholder.com/400x300' }} 
            style={styles.image} 
        />

        <View style={styles.contentContainer}>
            {/* CABECERA */}
            <View style={styles.headerRow}>
                <View style={{flex: 1}}>
                    <Text style={styles.category}>{recipe.category}</Text>
                    <Text style={styles.title}>{recipe.name}</Text>
                </View>
                {/* Botón de compartir o favorito (visual por ahora) */}
                <View style={styles.ratingContainer}>
                    <Text style={{fontSize: 16}}>⭐ 5.0</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* INGREDIENTES */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingredientes</Text>
                <TouchableOpacity onPress={handleAddToShoppingList}>
                    <Ionicons name="cart-outline" size={24} color="#FF6B00" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.listContainer}>
                {recipe.ingredients && recipe.ingredients.map((ing: any, index: number) => (
                    <View key={index} style={styles.ingredientRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.ingredientText}>
                            <Text style={{fontWeight: 'bold'}}>{ing.quantity} </Text> 
                            {ing.name}
                        </Text>
                    </View>
                ))}
            </View>

            {/* PASOS */}
            <Text style={styles.sectionTitle}>Preparación</Text>
            <View style={styles.listContainer}>
                {recipe.procedure && recipe.procedure.map((step: any, index: number) => (
                    <View key={index} style={styles.stepRow}>
                        <View style={styles.stepNumberContainer}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step.name}</Text>
                    </View>
                ))}
            </View>

            {/* BOTÓN ELIMINAR (ZONA DE PELIGRO) */}
            <View style={styles.dangerZone}>
                <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={handleDeleteRecipe}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="trash-outline" size={20} color="white" style={{marginRight: 8}} />
                            <Text style={styles.deleteButtonText}>Eliminar Receta</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

        </View>
      </ScrollView>
      
      {/* Botón Flotante para regresar (Opcional, si no te gusta el header nativo) */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  
  contentContainer: { 
      marginTop: -20, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, 
      padding: 25, minHeight: 500 
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  category: { color: '#FF6B00', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 12, marginBottom: 5 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  ratingContainer: { backgroundColor: '#FFF5E6', padding: 5, borderRadius: 8 },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },

  listContainer: { marginBottom: 25 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6B00', marginRight: 10 },
  ingredientText: { fontSize: 16, color: '#555', lineHeight: 22 },

  stepRow: { flexDirection: 'row', marginBottom: 20 },
  stepNumberContainer: { 
      width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', 
      justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  stepNumber: { color: '#fff', fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 16, color: '#555', lineHeight: 24 },

  dangerZone: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20, alignItems: 'center' },
  deleteButton: { 
      backgroundColor: '#FF3B30', flexDirection: 'row', alignItems: 'center', 
      paddingVertical: 12, paddingHorizontal: 25, borderRadius: 30 
  },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  backButton: { 
      position: 'absolute', top: 50, left: 20, width: 40, height: 40, 
      backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' 
  }
});