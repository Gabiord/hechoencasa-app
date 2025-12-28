import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Firebase
import { auth, db } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargamos las recetas cada vez que entramos al perfil
  useFocusEffect(
    useCallback(() => {
      fetchMyRecipes();
    }, [])
  );

  const fetchMyRecipes = async () => {
    // NOTA: En el futuro, aquí deberías usar una query para filtrar:
    // where("creatorUid", "==", user.uid)
    // Por ahora, traemos todas para armar la estructura visual.
    try {
      const querySnapshot = await getDocs(collection(db, "recipes"));
      const recipesList: any[] = [];
      querySnapshot.forEach((doc) => {
        recipesList.push({ ...doc.data(), uid: doc.id });
      });
      setMyRecipes(recipesList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función de Cerrar Sesión (Movida desde Home)
  const handleLogout = () => {
      Alert.alert("Cerrar Sesión", "¿Estás seguro?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => {
            signOut(auth)
              .then(() => navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] }))
              .catch((error) => Alert.alert("Error", error.message));
        }}
      ]);
  }

  // --- Componente de Cabecera (Estilo Instagram) ---
  const renderHeader = () => (
    <View style={styles.headerContainer}>
        <View style={styles.topRow}>
            {/* Foto de Perfil (Placeholder por ahora) */}
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
              style={styles.profilePic} 
            />
            
            {/* Estadísticas */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{myRecipes.length}</Text>
                    <Text style={styles.statLabel}>Recetas</Text>
                </View>
                {/* Datos simulados para el look & feel */}
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>1.2k</Text>
                    <Text style={styles.statLabel}>Seguidores</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>350</Text>
                    <Text style={styles.statLabel}>Seguidos</Text>
                </View>
            </View>
        </View>

        {/* Info del Usuario */}
        <Text style={styles.userName}>{user?.email?.split('@')[0] || "Chef"}</Text>
        <Text style={styles.userBio}>Apasionado por la cocina. Compartiendo mis mejores platos. 🍳🥑</Text>
        
        {/* Botón de Editar/Logout */}
        <View style={styles.actionButtonsContainer}>
             <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
        </View>
       
       <Text style={styles.sectionTitle}>Mis Creaciones 👨‍🍳</Text>
    </View>
  );

  // --- Render de cada item de la grilla ---
  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
       style={styles.gridItem}
       onPress={() => navigation.navigate('RecipeDetailScreen', { recipe: item })}
    >
        <Image source={{ uri: item.image.uri }} style={styles.gridImage} />
        <Text numberOfLines={1} style={styles.gridTitle}>{item.name}</Text>
    </TouchableOpacity>
  );


  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={myRecipes}
        keyExtractor={(item) => item.uid}
        renderItem={renderGridItem}
        numColumns={2} // <-- ESTO HACE LA GRILLA
        ListHeaderComponent={renderHeader} // La cabecera va dentro del scroll
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },

  // --- Header Styles ---
  headerContainer: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  profilePic: { width: 80, height: 80, borderRadius: 40, marginRight: 20, borderWidth: 2, borderColor: '#FF6B00' },
  statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userBio: { fontSize: 14, color: '#444', marginTop: 5, marginBottom: 15 },
  
  actionButtonsContainer: { flexDirection: 'row', marginBottom: 20 },
  editButton: { flex: 1, backgroundColor: '#eee', padding: 8, borderRadius: 5, alignItems: 'center', marginRight: 10 },
  editButtonText: { fontWeight: '600', color: '#333' },
  logoutButton: { flex: 1, backgroundColor: '#ffebe6', padding: 8, borderRadius: 5, alignItems: 'center' },
  logoutButtonText: { fontWeight: '600', color: '#FF3B30' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 15 },

  // --- Grid Styles ---
  gridItem: { flex: 1, margin: 5, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9f9f9', elevation: 1 },
  gridImage: { width: '100%', height: 120, resizeMode: 'cover' },
  gridTitle: { padding: 8, fontSize: 12, fontWeight: '600', textAlign: 'center' },
});