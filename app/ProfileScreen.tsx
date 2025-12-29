import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Firebase
import { auth, db } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;
  
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(true);

  // Se ejecuta cada vez que entras a la pantalla (para refrescar foto y datos)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    if (!user) return;

    try {
      // 1. CARGAR DATOS DEL PERFIL (Nombre, Foto, Bio)
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data());
      }

      // 2. CARGAR MIS RECETAS REALES (Filtradas por ID)
      const q = query(
          collection(db, "recipes"), 
          where("creatorUid", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);
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
    // PREPARACIÓN DE DATOS
    const displayName = userProfile?.displayName || user?.email?.split('@')[0];
    const username = userProfile?.username ? `@${userProfile.username}` : '';
    const accountType = userProfile?.accountType || 'Chef';
    const location = userProfile?.location || '';
    
    // 👇 AQUÍ ESTÁ LA CORRECCIÓN CLAVE:
    // Si existe photoURL en Firebase, la usamos. Si no, usamos la genérica.
    const profileImage = userProfile?.photoURL 
        ? { uri: userProfile.photoURL }
        : { uri: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' };

    return (
      <View style={styles.headerContainer}>
          <View style={styles.topRow}>
              {/* FOTO DINÁMICA */}
              <Image source={profileImage} style={styles.profilePic} />
              
              {/* ESTADÍSTICAS */}
              <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{myRecipes.length}</Text>
                      <Text style={styles.statLabel}>Recetas</Text>
                  </View>
                  <View style={styles.statItem}>
                      <Text style={styles.statNumber}>0</Text>
                      <Text style={styles.statLabel}>Seguidores</Text>
                  </View>
                  <View style={styles.statItem}>
                      <Text style={styles.statNumber}>0</Text>
                      <Text style={styles.statLabel}>Seguidos</Text>
                  </View>
              </View>
          </View>

          {/* DATOS DE TEXTO */}
          <View style={styles.nameContainer}>
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.typeBadge}>
               <Text style={styles.typeText}>{accountType}</Text>
            </View>
          </View>
          
          <Text style={styles.userHandle}>{username}</Text>
          {location !== '' && <Text style={styles.location}>📍 {location}</Text>}

          <Text style={styles.userBio}>
            {userProfile?.bio || "Aún no has escrito una biografía. ¡Dale a editar!"}
          </Text>
          
          {/* BOTONES */}
          <View style={styles.actionButtonsContainer}>
               <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditProfileScreen', { userProfile: userProfile })}
               >
                  <Text style={styles.editButtonText}>Editar Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
              </TouchableOpacity>
          </View>
         
         <Text style={styles.sectionTitle}>Mis Creaciones 👨‍🍳</Text>
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
        
        // Estado Vacío (Si no tienes recetas)
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}>
              <Text style={{ fontSize: 40 }}>🍲</Text>
              <Text style={{ fontSize: 16, color: '#666', fontWeight: 'bold', marginTop: 10 }}>
                Aún no has subido recetas
              </Text>
              <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 5 }}>
                Tus platos aparecerán aquí.
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
  
  // Foto de perfil
  profilePic: { 
      width: 80, height: 80, borderRadius: 40, marginRight: 20, 
      borderWidth: 2, borderColor: '#FF6B00', backgroundColor: '#eee' 
  },
  
  statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 8 },
  typeBadge: { backgroundColor: '#FF6B00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

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