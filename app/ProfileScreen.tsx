import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Firebase
import { auth, db } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'; // Ya no necesitamos query/where

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;
  
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    if (!user) return;

    try {
      // 1. DATOS DEL PERFIL (Igual que antes)
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data());
      }

      // 2. RECETAS PRIVADAS (EL CAMBIO 🔄)
      // Antes: collection 'recipes' (público)
      // Ahora: users -> UID -> my_recipes
      const privateRecipesRef = collection(db, `users/${user.uid}/my_recipes`);
      const querySnapshot = await getDocs(privateRecipesRef);
      
      const recipesList: any[] = [];
      querySnapshot.forEach((doc) => {
        recipesList.push({ ...doc.data(), uid: doc.id });
      });

      setMyRecipes(recipesList);

    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const renderHeader = () => {
    const displayName = userProfile?.displayName || user?.email?.split('@')[0];
    const username = userProfile?.username ? `@${userProfile.username}` : '';
    // Si no hay bio, mostramos un mensaje invitando a usar la IA
    const bio = userProfile?.bio || "Guardando mis recetas favoritas con IA 🤖🍳";
    
    const profileImage = userProfile?.photoURL 
        ? { uri: userProfile.photoURL }
        : { uri: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' };

    return (
      <View style={styles.headerContainer}>
          <View style={styles.topRow}>
              <Image source={profileImage} style={styles.profilePic} />
              
              <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{myRecipes.length}</Text>
                      <Text style={styles.statLabel}>Guardadas</Text>
                  </View>
                  {/* Quitamos Seguidores/Seguidos porque ahora es un libro personal */}
                  <View style={styles.statItem}>
                      <Text style={styles.statNumber}>IA</Text>
                      <Text style={styles.statLabel}>Potenciado</Text>
                  </View>
              </View>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          
          <Text style={styles.userHandle}>{username}</Text>
          {userProfile?.location && <Text style={styles.location}>📍 {userProfile.location}</Text>}

          <Text style={styles.userBio}>{bio}</Text>
          
          <View style={styles.actionButtonsContainer}>
               <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditProfileScreen', { userProfile: userProfile })}
               >
                  <Text style={styles.editButtonText}>Editar Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Salir</Text>
              </TouchableOpacity>
          </View>
         
         <Text style={styles.sectionTitle}>Mi Colección ({myRecipes.length})</Text>
      </View>
    );
  };

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
        keyExtractor={(item) => item.uid || item.id}
        renderItem={renderGridItem}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}>
              <Text style={{ fontSize: 40 }}>🤖</Text>
              <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold', marginTop: 10 }}>
                Aún no tienes recetas
              </Text>
              <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 5 }}>
                Ve al botón (+) para importar una receta mágica.
              </Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },

  headerContainer: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  
  profilePic: { 
      width: 80, height: 80, borderRadius: 40, marginRight: 20, 
      borderWidth: 2, borderColor: '#FF6B00', backgroundColor: '#eee' 
  },
  
  statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 8 },

  userHandle: { fontSize: 14, color: '#666', marginBottom: 4 },
  location: { fontSize: 14, color: '#444', marginBottom: 8 },
  userBio: { fontSize: 14, color: '#444', marginBottom: 15, lineHeight: 20 },
  
  actionButtonsContainer: { flexDirection: 'row', marginBottom: 20 },
  editButton: { flex: 1, backgroundColor: '#eee', padding: 8, borderRadius: 5, alignItems: 'center', marginRight: 10 },
  editButtonText: { fontWeight: '600', color: '#333' },
  logoutButton: { flex: 1, backgroundColor: '#ffebe6', padding: 8, borderRadius: 5, alignItems: 'center' },
  logoutButtonText: { fontWeight: '600', color: '#FF3B30' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 15 },

  gridItem: { flex: 1, margin: 5, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9f9f9', elevation: 1 },
  gridImage: { width: '100%', height: 120, resizeMode: 'cover' },
  gridTitle: { padding: 8, fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#333' },
});