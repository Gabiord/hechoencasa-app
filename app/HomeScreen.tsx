import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, 
  TextInput, ScrollView, Modal, Keyboard 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; 

// Firebase
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  
  // DATOS
  const [recipes, setRecipes] = useState<any[]>([]); 
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // FILTROS PRINCIPALES
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const categories = ['Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Postre'];

  // --- NUEVO: LÓGICA DE INGREDIENTES (MODAL) ---
  const [modalVisible, setModalVisible] = useState(false);
  const [myIngredients, setMyIngredients] = useState<string[]>([]); // Lista de ingredientes filtro (ej: ['Pollo', 'Arroz'])
  const [tempIngredientInput, setTempIngredientInput] = useState(''); // Lo que escribes en el modal

  // Carga inicial
  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [])
  );

  // ESTE ES EL CEREBRO 🧠: Se activa si cambia Texto, Categoría o Ingredientes
  useEffect(() => {
    filterRecipes();
  }, [searchText, selectedCategory, myIngredients, recipes]);

  const fetchRecipes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'recipes'));
      const recipesList: any[] = [];
      querySnapshot.forEach((doc) => {
        recipesList.push({ ...doc.data(), id: doc.id });
      });
      setRecipes(recipesList);
      setFilteredRecipes(recipesList); 
    } catch (error) {
      console.error("Error cargando recetas:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIONES DEL MODAL DE INGREDIENTES ---
  const addIngredientFilter = () => {
      if (tempIngredientInput.trim()) {
          // Agregamos a la lista
          setMyIngredients([...myIngredients, tempIngredientInput.trim()]);
          setTempIngredientInput(''); // Limpiamos input
      }
  };

  const removeIngredientFilter = (ingToRemove: string) => {
      setMyIngredients(myIngredients.filter(ing => ing !== ingToRemove));
  };

  const clearIngredientFilters = () => {
      setMyIngredients([]);
      setModalVisible(false);
  };

  // --- LÓGICA DE FILTRADO MAESTRA ---
  const filterRecipes = () => {
    let result = recipes;

    // 1. Filtro por Categoría
    if (selectedCategory !== 'Todas') {
        result = result.filter(item => item.category === selectedCategory);
    }

    // 2. Filtro por Nombre (Buscador Principal)
    if (searchText) {
        const text = searchText.toLowerCase();
        result = result.filter(item => item.name.toLowerCase().includes(text));
    }

    // 3. NUEVO: Filtro por Ingredientes (Modo Refrigerador)
    if (myIngredients.length > 0) {
        result = result.filter(recipe => {
            // Verificamos si la receta tiene ingredientes
            if (!recipe.ingredients) return false;

            // La receta pasa si contiene AL MENOS UNO de mis ingredientes
            // Iteramos sobre los ingredientes de la receta
            const hasMatch = recipe.ingredients.some((rIng: any) => {
                const recipeIngName = rIng.name.toLowerCase();
                // Verificamos si coincide con alguno de mis ingredientes buscados
                return myIngredients.some(myIng => recipeIngName.includes(myIng.toLowerCase()));
            });

            return hasMatch;
        });
    }

    setFilteredRecipes(result);
  };

  const renderRecipe = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('RecipeDetailScreen', { recipe: item })}
    >
      <Image source={{ uri: item.image.uri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
            <Text style={styles.categoryBadge}>{item.category}</Text>
            <Text style={styles.rating}>⭐ {item.rate}</Text>
        </View>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.chef}>Por: {item.chef}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>;

  return (
    <View style={styles.container}>
      {/* MODAL DE INGREDIENTES */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>¿Qué tienes en tu refri? 🧊</Text>
                <Text style={styles.modalSubtitle}>Agrega ingredientes para filtrar recetas</Text>
                
                {/* Input del Modal */}
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

                {/* Lista de Chips (Tags) */}
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

                {/* Botones de Acción */}
                <TouchableOpacity style={styles.applyButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.applyButtonText}>Ver Recetas ({filteredRecipes.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.clearButton} onPress={clearIngredientFilters}>
                    <Text style={styles.clearButtonText}>Limpiar filtros</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
            <Text style={styles.greeting}>Hola, Chef 👋</Text>
            <Text style={styles.subGreeting}>¿Qué cocinamos hoy?</Text>
        </View>
      </View>

      {/* BARRA DE BÚSQUEDA + BOTÓN FILTRO */}
      <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
            <TextInput 
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                value={searchText}
                onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
          </View>

          {/* BOTÓN PARA ABRIR MODAL */}
          <TouchableOpacity 
            style={[styles.filterButton, myIngredients.length > 0 && styles.filterButtonActive]} 
            onPress={() => setModalVisible(true)}
          >
              <Ionicons name="options" size={24} color={myIngredients.length > 0 ? "white" : "#666"} />
          </TouchableOpacity>
      </View>

      {/* FILTRO DE CATEGORÍAS */}
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

      {/* LISTA DE RECETAS */}
      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.center}>
                <Text style={{fontSize: 40}}>🍳</Text>
                <Text style={{color: '#999', marginTop: 10, textAlign: 'center'}}>
                    No hay recetas que coincidan con tus ingredientes.
                </Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: 50 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 50, paddingHorizontal: 20 },
  
  header: { paddingHorizontal: 20, marginBottom: 15 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subGreeting: { fontSize: 16, color: '#666' },

  // Buscador y Filtro Row
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, alignItems: 'center' },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginRight: 10,
    paddingHorizontal: 15, height: 50, borderRadius: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05
  },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  
  // Botón Filtro
  filterButton: {
      width: 50, height: 50, backgroundColor: '#fff', borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      elevation: 2, borderWidth: 1, borderColor: '#eee'
  },
  filterButtonActive: {
      backgroundColor: '#FF6B00', borderColor: '#FF6B00'
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  
  modalInputContainer: { flexDirection: 'row', marginBottom: 15 },
  modalInput: { 
      flex: 1, backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, 
      marginRight: 10, borderWidth: 1, borderColor: '#eee' 
  },
  modalAddBtn: { backgroundColor: '#FF6B00', width: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  filterChip: { 
      flexDirection: 'row', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 8, 
      borderRadius: 20, marginRight: 8, marginBottom: 8, alignItems: 'center' 
  },
  filterChipText: { color: '#fff', fontWeight: 'bold' },

  applyButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  clearButton: { padding: 15, alignItems: 'center' },
  clearButtonText: { color: '#666' },

  // Categorías y Listas
  categoriesContainer: { paddingHorizontal: 20, alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: '#fff', borderRadius: 20, marginRight: 10,
    borderWidth: 1, borderColor: '#eee'
  },
  categoryChipSelected: { backgroundColor: '#FF6B00', borderColor: '#FF6B00', elevation: 2 },
  categoryText: { color: '#666', fontWeight: '600' },
  categoryTextSelected: { color: '#fff' },

  listContent: { padding: 20, paddingBottom: 100 },
  
  // Tarjetas
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  cardImage: { width: '100%', height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  cardContent: { padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  categoryBadge: { color: '#FF6B00', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  rating: { fontSize: 12, color: '#444' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  chef: { fontSize: 14, color: '#888' },
});