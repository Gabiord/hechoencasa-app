import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Importaciones de Firebase (Auth + Firestore)
import { auth, db } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  
  // Estados
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userEmail = auth.currentUser?.email || "Chef";

  // Lógica de Logout 
  const handleLogout = () => {
      signOut(auth)
          .then(() => {
              navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
          })
          .catch((error) => Alert.alert("Error", error.message));
  }

  // Lógica para traer las recetas de Firebase
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "recipes"));
        const recipesList: any[] = [];
        
        querySnapshot.forEach((doc) => {
          recipesList.push({ ...doc.data(), uid: doc.id });
        });

        setRecipes(recipesList);
      } catch (error) {
        console.error("Error cargando recetas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  // Diseño de la Tarjeta (Card)
  const renderRecipeCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('RecipeDetailScreen', { recipe: item })}
    >
      <Image source={{ uri: item.image.uri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <Text style={styles.rating}>⭐ {item.rate}</Text>
        </View>
        <Text style={styles.recipeTitle}>{item.name}</Text>
        <Text style={styles.chef}>Por: {item.chef}</Text>
      </View>
    </TouchableOpacity>
  );

  // Pantalla de Carga
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado Personalizado con Logout */}
      <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {userEmail.split('@')[0]} 👋</Text>
            <Text style={styles.subGreeting}>¿Qué cocinamos hoy?</Text>
          </View>

      </View>

      {/* Lista de Recetas */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeCard}
        keyExtractor={(item) => item.uid || item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 50 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header Styles
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 20 
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subGreeting: { fontSize: 14, color: '#666' },
  logoutButton: { backgroundColor: '#ffebe6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 12 },

  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardContent: { padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  categoryBadge: { 
    color: '#FF6B00', fontWeight: '800', fontSize: 10, textTransform: 'uppercase', 
    backgroundColor: '#fff5eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 
  },
  rating: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  recipeTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  chef: { fontSize: 12, color: '#888' },
});