import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// Firebase
import { auth, db } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore'; // <--- Agregamos getDoc y doc

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = auth.currentUser;

  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null); // <--- Aquí guardaremos los datos del usuario
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    if (!user) return;

    try {
      // 1. CARGAR DATOS DEL PERFIL
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data());
      } else {
        console.log("No se encontró el perfil en Firestore");
      }

      // 2. CARGAR MIS RECETAS REALES 🍳
      // Creamos una "Pregunta" (Query) para Firebase
      const q = query(
        collection(db, "recipes"),
        where("creatorUid", "==", user.uid) // <--- EL FILTRO MÁGICO
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
      {
        text: "Salir", style: "destructive", onPress: () => {
          signOut(auth)
            .then(() => navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] }))
            .catch((error) => Alert.alert("Error", error.message));
        }
      }
    ]);
  }

  const renderHeader = () => {
    // Si aún no carga el perfil, mostramos datos genéricos del Auth
    const displayName = userProfile?.displayName || user?.email?.split('@')[0];
    const username = userProfile?.username ? `@${userProfile.username}` : '';
    const accountType = userProfile?.accountType || 'Chef';
    const location = userProfile?.location || '';

    return (
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          {/* Foto de Perfil (Placeholder) */}
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

        {/* DATOS REALES DEL USUARIO */}
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{displayName}</Text>
          {/* Badge del tipo de cuenta (Ej: Chef, ONG) */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{accountType}</Text>
          </View>
        </View>

        <Text style={styles.userHandle}>{username}</Text>
        {location !== '' && <Text style={styles.location}>📍 {location}</Text>}

        {/* Si el usuario tiene bio, la mostramos. Si no, mostramos un texto por defecto */}
        <Text style={styles.userBio}>
          {userProfile?.bio || "Aún no has escrito una biografía. ¡Dale a editar para presentarte!"}
        </Text>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfileScreen', { userProfile: userProfile })}>
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
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50, padding: 20 }}>
            <Text style={{ fontSize: 40 }}>👨‍🍳</Text>
            <Text style={{ fontSize: 18, color: '#666', fontWeight: 'bold', marginTop: 10 }}>
              Aún no has subido recetas
            </Text>
            <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 5 }}>
              Tus creaciones aparecerán aquí cuando las publiques.
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

  // Header Styles
  headerContainer: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  profilePic: { width: 80, height: 80, borderRadius: 40, marginRight: 20, borderWidth: 2, borderColor: '#FF6B00' },
  statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },

  // Nombre y Badge
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

  // Grid Styles
  gridItem: { flex: 1, margin: 5, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f9f9f9', elevation: 1 },
  gridImage: { width: '100%', height: 120, resizeMode: 'cover' },
  gridTitle: { padding: 8, fontSize: 12, fontWeight: '600', textAlign: 'center', color: '#333' },
});