import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Importaciones de Firebase
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function SavedRecipesScreen() {
  const navigation = useNavigation<any>();
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect: Se ejecuta cada vez que entras a esta pestaña
  // Así, si guardaste una receta nueva desde el Home, aparecerá aquí automáticamente.
  useFocusEffect(
    useCallback(() => {
      fetchSavedRecipes();
    }, [])
  );

  const fetchSavedRecipes = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        setLoading(false);
        return;
    }

    try {
      // Leemos de la colección PRIVADA del usuario
      const querySnapshot = await getDocs(collection(db, 'users', userId, 'saved_recipes'));
      const recipesList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        // Guardamos los datos y el ID del documento para poder borrarlo luego
        recipesList.push({ ...doc.data(), uid: doc.id });
      });

      setSavedRecipes(recipesList);
    } catch (error) {
      console.error("Error al cargar recetas guardadas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para borrar una receta
  const handleDelete = (recipeId: string, recipeName: string) => {
      Alert.alert(
          "¿Eliminar receta?",
          `¿Quieres sacar "${recipeName}" de tus guardados? Se eliminarán sus ingredientes de la lista de compras.`,
          [
              { text: "Cancelar", style: "cancel" },
              { 
                  text: "Eliminar", 
                  style: 'destructive',
                  onPress: async () => {
                      try {
                          const userId = auth.currentUser?.uid;
                          if (!userId) return;

                          // 1. Borramos de Firebase
                          await deleteDoc(doc(db, 'users', userId, 'saved_recipes', recipeId));
                          
                          // 2. Actualizamos la lista visualmente (quitamos el item borrado)
                          setSavedRecipes(prev => prev.filter(item => item.uid !== recipeId));
                          
                          Alert.alert("Eliminada", "La receta se ha eliminado.");
                      } catch (error) {
                          Alert.alert("Error", "No se pudo eliminar la receta.");
                      }
                  }
              }
          ]
      );
  };

  const renderSavedRecipe = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {/* Al tocar la imagen o el texto, vamos al detalle */}
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={() => navigation.navigate('RecipeDetailScreen', { recipe: item })}
      >
        <Image source={{ uri: item.image.uri }} style={styles.cardImage} />
        <View style={styles.textContainer}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.chef}>Por: {item.chef}</Text>
        </View>
      </TouchableOpacity>

      {/* Botón de Papelera (Separado para no activar la navegación al borrar) */}
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => handleDelete(item.uid, item.name)}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Mis Recetas Guardadas ❤️</Text>

      <FlatList
      style={{ flex: 1 }}
        data={savedRecipes}
        renderItem={renderSavedRecipe}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        
        // Mensaje si no hay nada guardado
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aún no tienes recetas favoritas.</Text>
            <Text style={styles.emptySubText}>Ve al inicio y guarda algunas para verlas aquí.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 26, fontWeight: 'bold', marginLeft: 20, marginBottom: 20, color: '#333' },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  
  // Estilos de la Tarjeta Horizontal
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row', // Para que la imagen esté a la izquierda y texto a la derecha
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    overflow: 'hidden'
  },
  cardContent: {
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center'
  },
  cardImage: { width: 80, height: 80, borderRadius: 12, margin: 10 },
  textContainer: { flex: 1, justifyContent: 'center' },
  category: { fontSize: 10, color: '#FF6B00', fontWeight: 'bold', textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  chef: { fontSize: 12, color: '#888' },

  // Botón de eliminar
  deleteButton: {
      padding: 15,
      //height: '100%',
      justifyContent: 'center',
      backgroundColor: '#fff', // Un blanco muy suave de fondo
      borderLeftWidth: 1,
      borderLeftColor: '#eee'
  },
  deleteIcon: { fontSize: 20 },

  // Estado vacío
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#ccc' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 10 },
});