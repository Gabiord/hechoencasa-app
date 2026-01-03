import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, 
  TextInput, ScrollView, Modal 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; 

// Firebase
// ⚠️ NOTA: Ahora importamos 'doc' también para apuntar al usuario específico
import { collection, getDocs } from 'firebase/firestore'; 
import { auth, db } from './firebaseConfig';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser; // Necesitamos el usuario actual
  
  // DATOS
  const [recipes, setRecipes] = useState<any[]>([]); 
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // FILTROS
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const categories = ['Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Postre', 'Snack']; // Agregué Snack

  // MODAL INGREDIENTES
  const [modalVisible, setModalVisible] = useState(false);
  const [myIngredients, setMyIngredients] = useState<string[]>([]); 
  const [tempIngredientInput, setTempIngredientInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchMyPrivateRecipes();
    }, [])
  );

  useEffect(() => {
    filterRecipes();
  }, [searchText, selectedCategory, myIngredients, recipes]);

  const fetchMyPrivateRecipes = async () => {
    if (!user) return;

    try {
      // 👇 EL CAMBIO MAGISTRAL:
      // En lugar de buscar en "recipes" (público), buscamos DENTRO del usuario
      // Ruta: users / UID_DEL_USUARIO / my_recipes
      const privateRecipesRef = collection(db, `users/${user.uid}/my_recipes`);
      
      const querySnapshot = await getDocs(privateRecipesRef);
      const recipesList: any[] = [];
      
      querySnapshot.forEach((doc) => {
        recipesList.push({ ...doc.data(), id: doc.id });
      });

      setRecipes(recipesList);
      setFilteredRecipes(recipesList); 
    } catch (error) {
      console.error("Error cargando recetas privadas:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTROS (Se mantiene igual de potente) ---
  const addIngredientFilter = () => {
      if (tempIngredientInput.trim()) {
          setMyIngredients([...myIngredients, tempIngredientInput.trim()]);
          setTempIngredientInput('');
      }
  };

  const removeIngredientFilter = (ingToRemove: string) => {
      setMyIngredients(myIngredients.filter(ing => ing !== ingToRemove));
  };

  const clearIngredientFilters = () => {
      setMyIngredients([]);
      setModalVisible(false);
  };

  const filterRecipes = () => {
    let result = recipes;

    // 1. Categoría
    if (selectedCategory !== 'Todas') {
        result = result.filter(item => item.category === selectedCategory);
    }

    // 2. Nombre
    if (searchText) {
        const text = searchText.toLowerCase();
        result = result.filter(item => item.name.toLowerCase().includes(text));
    }

    // 3. Ingredientes
    if (myIngredients.length > 0) {
        result = result.filter(recipe => {
            if (!recipe.ingredients) return false;
            return recipe.ingredients.some((rIng: any) => {
                const recipeIngName = rIng.name.toLowerCase();
                return myIngredients.some(myIng => recipeIngName.includes(myIng.toLowerCase()));
            });
        });
    }

    setFilteredRecipes(result);
  };

  // Render de Tarjeta (Simplificado para vista personal)
  const renderRecipe = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('RecipeDetailScreen', { recipe: item })}
    >
      <Image source={{ uri: item.image.uri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            {/* Ya no mostramos el Chef porque eres tú */}
            <Text style={styles.rating}>⭐ {item.rate || '5'}</Text> 
        </View>
        <Text style={styles.title}>{item.name}</Text>
        
        {/* Mostramos un resumen breve de ingredientes en lugar del chef */}
        <Text style={styles.ingPreview} numberOfLines={1}>
            {item.ingredients ? item.ingredients.map((i:any) => i.name).join(', ') : 'Sin ingredientes'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>;

  return (
    <View style={styles.container}>
      {/* MODAL (Igual que antes) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>¿Qué tienes en tu refri? 🧊</Text>
                <Text style={styles.modalSubtitle}>Filtra tu libro de recetas</Text>
                
                <View style={styles.modalInputContainer}>
                    <TextInput 
                        style={styles.modalInput} 
                        placeholder="Ej: Pollo, Limón..." 
                        value={tempIngredientInput}
                        onChangeText={setTempIngredientInput}
                    />
                    <TouchableOpacity style={styles.modalAddBtn} onPress={addIngredientFilter}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.chipsContainer}>
                    {myIngredients.map((ing, index) => (
                        <View key={index} style={styles.filterChip}>
                            <Text style={styles.filterChipText}>{ing}</Text>
                            <TouchableOpacity onPress={() => removeIngredientFilter(ing)}>
                                <Ionicons name="close-circle" size={18} color="#fff" style={{marginLeft: 5}}/>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={styles.applyButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.applyButtonText}>Filtrar ({filteredRecipes.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearButton} onPress={clearIngredientFilters}>
                    <Text style={styles.clearButtonText}>Limpiar</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* HEADER: Ahora es personal */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Mi Recetario 📖</Text>
        <Text style={styles.subGreeting}>Colección personal</Text>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
            <TextInput 
                style={styles.searchInput}
                placeholder="Buscar en mis recetas..."
                value={searchText}
                onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.filterButton, myIngredients.length > 0 && styles.filterButtonActive]} 
            onPress={() => setModalVisible(true)}
          >
              <Ionicons name="options" size={24} color={myIngredients.length > 0 ? "white" : "#666"} />
          </TouchableOpacity>
      </View>

      {/* CATEGORÍAS */}
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {categories.map((cat) => (
                <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat)}
                >
                    <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextSelected]}>
                        {cat}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* LISTA VACÍA POR AHORA */}
      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.center}>
                <Text style={{fontSize: 40}}>✨</Text>
                <Text style={{color: '#333', fontWeight: 'bold', marginTop: 10, fontSize: 18}}>
                    Tu libro está vacío
                </Text>
                <Text style={{color: '#999', marginTop: 5, textAlign: 'center', paddingHorizontal: 40}}>
                    Usa el botón (+) para importar tu primera receta con IA.
                </Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 50 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 20 },
  
  header: { paddingHorizontal: 20, marginBottom: 15 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subGreeting: { fontSize: 16, color: '#666' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, alignItems: 'center' },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginRight: 10,
    paddingHorizontal: 15, height: 50, borderRadius: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  filterButton: {
      width: 50, height: 50, backgroundColor: '#fff', borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      elevation: 2, borderWidth: 1, borderColor: '#eee'
  },
  filterButtonActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },

  // Modal y Chips
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  modalInputContainer: { flexDirection: 'row', marginBottom: 15 },
  modalInput: { flex: 1, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  modalAddBtn: { backgroundColor: '#FF6B00', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  filterChip: { flexDirection: 'row', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, alignItems: 'center' },
  filterChipText: { color: '#fff', fontWeight: 'bold' },
  applyButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  clearButton: { padding: 15, alignItems: 'center' },
  clearButtonText: { color: '#666' },

  categoriesContainer: { paddingHorizontal: 20, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  categoryChipSelected: { backgroundColor: '#FF6B00', borderColor: '#FF6B00', elevation: 2 },
  categoryText: { color: '#666', fontWeight: '600' },
  categoryTextSelected: { color: '#fff' },

  listContent: { padding: 20, paddingBottom: 100 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardImage: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardContent: { padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  categoryBadge: { color: '#FF6B00', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  rating: { fontSize: 12, color: '#444' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  ingPreview: { fontSize: 14, color: '#888', fontStyle: 'italic' },
});