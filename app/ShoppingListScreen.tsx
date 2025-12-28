import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Importaciones de Firebase
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function ShoppingListScreen() {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estado local para saber qué items están tachados (visual)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});


    // useFocusEffect: Se ejecuta cada vez que entras a la pestaña "Lista"
    // Esto asegura que si acabas de guardar una receta, la lista se actualice.
    useFocusEffect(
        useCallback(() => {
            calculateShoppingList();
        }, [])
    );

    const calculateShoppingList = async () => {
        setLoading(true);
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
            // 1. Traemos todas las recetas guardadas de este usuario
            const querySnapshot = await getDocs(collection(db, 'users', userId, 'saved_recipes'));


            // 2. El "Diccionario Acumulador"
            // Aquí guardaremos temporalmente las sumas.
            // Ejemplo visual de lo que hace: { "arroz": 4, "pollo": 1, "cebolla": 2 }
            const totals: Record<string, number> = {};

            querySnapshot.forEach((doc) => {
                const recipe = doc.data();

// Si la receta tiene ingredientes...
                if (recipe.ingredients) {
                    recipe.ingredients.forEach((ing: any) => {

                        // Limpieza de datos:
                        // Convertimos a minúsculas para que "Arroz" y "arroz" sean lo mismo
                        const name = ing.name.toLowerCase().trim();

                        // Aseguramos que la cantidad sea un número
                        const qty = parseFloat(ing.quantity) || 0;

                        // Lógica de Suma:
                        if (totals[name]) totals[name] += qty;
                        else totals[name] = qty;
                    });
                }
            });


            // 3. Convertimos el diccionario en una lista bonita para el FlatList
            const listArray = Object.keys(totals).map((key, index) => ({
                id: index.toString(),
                name: key.charAt(0).toUpperCase() + key.slice(1),
                quantity: totals[key]
            }));

            setIngredients(listArray);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // FUNCIÓN 1: Tachar / Destachar item
    const toggleCheck = (name: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [name]: !prev[name] // Invierte el valor (true/false)
        }));
    };

    // FUNCIÓN 2: Vaciar Lista (Borrar recetas guardadas)
    const clearList = async () => {
        Alert.alert(
            "¿Vaciar Lista?",
            "Esto borrará todas las recetas guardadas y limpiará tu lista de compras.",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Sí, Vaciar", 
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const userId = auth.currentUser?.uid;
                        if (!userId) return;

                        try {
                            // Obtenemos todas las recetas guardadas
                            const querySnapshot = await getDocs(collection(db, 'users', userId, 'saved_recipes'));
                            
                            // Usamos un 'Batch' para borrar todas juntas (más eficiente)
                            const batch = writeBatch(db);
                            querySnapshot.forEach((documento) => {
                                batch.delete(documento.ref);
                            });

                            await batch.commit(); // Ejecutar borrado
                            
                            // Limpiamos estados locales
                            setIngredients([]);
                            setCheckedItems({});
                            Alert.alert("Lista Limpia", "¡Listo para la próxima compra! 🧹");
                            
                        } catch (error) {
                            Alert.alert("Error", "No se pudo vaciar la lista");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>;
    }

    return (
        <View style={styles.container}>
            {/* Header con botón de Basura */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Lista de Compras 🛒</Text>
                    <Text style={styles.subtitle}>{ingredients.length} productos</Text>
                </View>
                
                {ingredients.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearList}>
                        <Text style={styles.clearButtonText}>🗑️ Vaciar</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={ingredients}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 5 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>¡Todo listo!</Text>
                        <Text style={styles.emptySubText}>No hay pendientes por comprar.</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isChecked = checkedItems[item.name];
                    return (
                        <TouchableOpacity 
                            style={[styles.row, isChecked && styles.rowChecked]} 
                            onPress={() => toggleCheck(item.name)}
                        >
                            <Text style={[styles.name, isChecked && styles.textChecked]}>
                                {item.name}
                            </Text>
                            
                            {/* Si está checkeado mostramos un ✅, si no, la cantidad */}
                            <View style={[styles.badge, isChecked && styles.badgeChecked]}>
                                <Text style={[styles.qty, isChecked && styles.textChecked]}>
                                    {isChecked ? "✅" : item.quantity}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20, paddingTop: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 14, color: '#666' },
    
    clearButton: { backgroundColor: '#ffebe6', padding: 10, borderRadius: 8 },
    clearButtonText: { color: '#FF3B30', fontWeight: 'bold' },

    // Row Styles
    row: {
        backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    },
    rowChecked: { backgroundColor: '#f0f0f0', elevation: 0 }, // Estilo cuando está tachado
    
    name: { fontSize: 18, color: '#444', fontWeight: '500' },
    textChecked: { textDecorationLine: 'line-through', color: '#aaa' }, // Efecto tachado

    badge: { 
        backgroundColor: '#fff0e0', paddingHorizontal: 12, paddingVertical: 6, 
        borderRadius: 8, minWidth: 40, alignItems: 'center' 
    },
    badgeChecked: { backgroundColor: 'transparent' },
    qty: { fontSize: 18, fontWeight: 'bold', color: '#FF6B00' },

    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#ccc' },
    emptySubText: { fontSize: 16, color: '#999', marginTop: 10 },
});