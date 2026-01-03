import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Importaciones de Firebase
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export default function ShoppingListScreen() {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estado local para saber qué items están tachados (visual)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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
            // 1. Traemos la colección 'shopping_list'
            const querySnapshot = await getDocs(collection(db, 'users', userId, 'shopping_list'));

            // 2. Diccionario Acumulador
            const totals: Record<string, { qty: number, unit: string }> = {};

            querySnapshot.forEach((doc) => {
                // 👇 CAMBIO IMPORTANTE:
                // El documento YA ES el ingrediente. No hay 'recipe.ingredients'.
                const item = doc.data(); 

                if (item.name) {
                    // Limpieza: " Harina " -> "harina"
                    const name = item.name.toLowerCase().trim();
                    
                    // Intentamos sacar el número: "2 tazas" -> 2. "500g" -> 500.
                    // Si es texto (ej: "al gusto"), parseFloat devuelve NaN, usamos 0.
                    const qtyNumber = parseFloat(item.quantity) || 0;
                    
                    // (Opcional) Podríamos intentar guardar la unidad (g, kg, tazas) 
                    // pero por simplicidad sumaremos números.

                    if (totals[name]) {
                        totals[name].qty += qtyNumber;
                    } else {
                        totals[name] = { qty: qtyNumber, unit: item.quantity }; 
                    }
                }
            });

            // 3. Convertimos a lista para FlatList
            const listArray = Object.keys(totals).map((key, index) => {
                const data = totals[key];
                // Si la suma es 0 (ej: "al gusto"), mostramos el texto original
                // Si es un número (ej: 4), mostramos el número
                const displayQty = data.qty > 0 ? data.qty.toString() : data.unit;

                return {
                    id: index.toString(),
                    name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalizar
                    quantity: displayQty 
                };
            });

            setIngredients(listArray);
        } catch (error) {
            console.error("Error cargando lista:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCheck = (name: string) => {
        setCheckedItems(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    const clearList = async () => {
        Alert.alert(
            "¿Vaciar Lista?",
            "Esto borrará todos los ingredientes de la lista.",
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
                            // 👇 CORRECCIÓN: Apuntamos a 'shopping_list', no 'saved_recipes'
                            const querySnapshot = await getDocs(collection(db, 'users', userId, 'shopping_list'));
                            
                            const batch = writeBatch(db);
                            querySnapshot.forEach((documento) => {
                                batch.delete(documento.ref);
                            });

                            await batch.commit();
                            
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Lista de Compras 🛒</Text>
                    <Text style={styles.subtitle}>{ingredients.length} productos pendientes</Text>
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
                contentContainerStyle={{ paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={{fontSize: 40}}>📝</Text>
                        <Text style={styles.emptyText}>Tu lista está vacía</Text>
                        <Text style={styles.emptySubText}>Añade ingredientes desde tus recetas.</Text>
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

    row: {
        backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    },
    rowChecked: { backgroundColor: '#f0f0f0', elevation: 0 }, 
    
    name: { fontSize: 18, color: '#444', fontWeight: '500', textTransform: 'capitalize' },
    textChecked: { textDecorationLine: 'line-through', color: '#aaa' },

    badge: { 
        backgroundColor: '#fff0e0', paddingHorizontal: 12, paddingVertical: 6, 
        borderRadius: 8, minWidth: 40, alignItems: 'center' 
    },
    badgeChecked: { backgroundColor: 'transparent' },
    qty: { fontSize: 16, fontWeight: 'bold', color: '#FF6B00' },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#ccc', marginTop: 10 },
    emptySubText: { fontSize: 16, color: '#999', marginTop: 5 },
});