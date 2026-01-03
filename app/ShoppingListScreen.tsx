import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { collection, getDocs, writeBatch, addDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

// --- UTILIDADES ---
const normalizeName = (text: string) => {
    return text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/s$/, "");
};

const getUnitType = (unit: string) => {
    if (['g', 'kg', 'gramos', 'kilos'].includes(unit)) return 'mass';
    if (['l', 'ml', 'litros', 'mililitros'].includes(unit)) return 'vol';
    return 'unit';
};

const convertToBase = (qty: number, unit: string) => {
    if (unit === 'kg' || unit === 'l') return qty * 1000;
    return qty; 
};

// Nueva función de formateo combinado
const formatCombinedDisplay = (mass: number, vol: number, units: number, originalUnitStr: string) => {
    const parts = [];

    // 1. Formatear Masa
    if (mass > 0) {
        if (mass >= 1000) parts.push(`${(mass / 1000).toFixed(2).replace(/\.00$/, '')} kg`);
        else parts.push(`${mass} g`);
    }

    // 2. Formatear Volumen
    if (vol > 0) {
        if (vol >= 1000) parts.push(`${(vol / 1000).toFixed(2).replace(/\.00$/, '')} L`);
        else parts.push(`${vol} ml`);
    }

    // 3. Formatear Unidades sueltas
    if (units > 0) {
        parts.push(`${units} ${originalUnitStr || 'ud'}`);
    }

    // Unimos con " + " (Ej: "1 kg + 200 ml")
    return parts.join(" + ");
};

export default function ShoppingListScreen() {
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    const [modalVisible, setModalVisible] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQtyNum, setNewItemQtyNum] = useState('');
    const [newItemUnit, setNewItemUnit] = useState('ud');

    const standardUnits = ['ud', 'kg', 'g', 'L', 'ml'];

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
            const querySnapshot = await getDocs(collection(db, 'users', userId, 'shopping_list'));
            
            // DICCIONARIO AGRUPADO POR NOMBRE
            // Clave: "azucar" (normalizado)
            // Valor: { name: "Azúcar", mass: 1000, vol: 200, unitCount: 0, lastUnitStr: "ud" }
            const totals: Record<string, { name: string, mass: number, vol: number, unitCount: number, lastUnitStr: string }> = {};

            querySnapshot.forEach((doc) => {
                const item = doc.data();
                if (item.name) {
                    const cleanName = normalizeName(item.name);
                    const rawQtyString = item.quantity ? item.quantity.toString().toLowerCase().trim() : "";
                    const match = rawQtyString.match(/^([\d\.]+)\s*(.*)$/);
                    
                    let qtyVal = 0;
                    let unitVal = "ud";

                    if (match) {
                        qtyVal = parseFloat(match[1]);
                        unitVal = match[2].trim() || "ud";
                    } else {
                        unitVal = rawQtyString;
                    }

                    // Normalizar unidades
                    if (unitVal === "gramos" || unitVal === "gr") unitVal = "g";
                    if (unitVal === "kilogramos" || unitVal === "kilos") unitVal = "kg";
                    if (unitVal === "litros" || unitVal === "litro") unitVal = "l";
                    if (unitVal === "mililitros" || unitVal === "cc") unitVal = "ml";
                    if (!standardUnits.includes(unitVal) && unitVal !== 'l') unitVal = "ud"; 

                    const type = getUnitType(unitVal);
                    const qtyBase = convertToBase(qtyVal, unitVal);

                    // Inicializamos si no existe
                    if (!totals[cleanName]) {
                        totals[cleanName] = { 
                            name: item.name, 
                            mass: 0, 
                            vol: 0, 
                            unitCount: 0, 
                            lastUnitStr: unitVal === 'ud' ? 'ud' : unitVal // Para mostrar algo si solo hay unidades
                        };
                    }

                    // Sumamos en la "cubeta" correcta
                    if (type === 'mass') totals[cleanName].mass += qtyBase;
                    else if (type === 'vol') totals[cleanName].vol += qtyBase;
                    else {
                        totals[cleanName].unitCount += qtyVal;
                        totals[cleanName].lastUnitStr = unitVal; // Guardamos el nombre de la unidad (ej: "paquetes")
                    }

                    // Mantenemos el nombre más bonito (más largo)
                    if (item.name.length > totals[cleanName].name.length) {
                         totals[cleanName].name = item.name; 
                    }
                }
            });

            // Generar Array Final
            const listArray = Object.keys(totals).map((key, index) => {
                const data = totals[key];
                
                // Usamos la nueva función de formateo combinado
                let displayQty = formatCombinedDisplay(data.mass, data.vol, data.unitCount, data.lastUnitStr);
                
                // Fallback si todo es 0 (ej: "al gusto")
                if (!displayQty) displayQty = data.lastUnitStr;

                return {
                    id: index.toString(),
                    name: data.name.charAt(0).toUpperCase() + data.name.slice(1), 
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

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const finalQuantity = `${newItemQtyNum || '1'} ${newItemUnit}`;

        try {
            await addDoc(collection(db, 'users', userId, 'shopping_list'), {
                name: newItemName.trim(),
                quantity: finalQuantity,
                checked: false,
                isManual: true
            });

            setModalVisible(false);
            setNewItemName('');
            setNewItemQtyNum('');
            setNewItemUnit('ud');
            calculateShoppingList();
            
        } catch (error) {
            Alert.alert("Error", "No se pudo agregar.");
        }
    };

    const toggleCheck = (name: string) => { setCheckedItems(prev => ({ ...prev, [name]: !prev[name] })); };
    
    const clearList = async () => {
        Alert.alert("¿Vaciar?", "Se borrará todo.", [{ text: "No", style: "cancel" }, { text: "Sí", style: 'destructive', onPress: async () => {
            setLoading(true); const userId = auth.currentUser?.uid; if(!userId) return;
            try { const q = await getDocs(collection(db, 'users', userId, 'shopping_list')); const b = writeBatch(db); q.forEach(d=>b.delete(d.ref)); await b.commit(); setIngredients([]); setCheckedItems({}); } 
            catch(e){ Alert.alert("Error"); } finally { setLoading(false); }
        }}]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B00" /></View>;

    return (
        <View style={styles.container}>
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Agregar Producto ➕</Text>
                        <Text style={styles.label}>Producto</Text>
                        <TextInput style={styles.input} placeholder="Ej: Manzanas" value={newItemName} onChangeText={setNewItemName} autoFocus />
                        <Text style={styles.label}>Cantidad</Text>
                        <View style={styles.qtyRow}>
                            <TextInput style={[styles.input, { flex: 0.4, marginBottom: 0 }]} placeholder="1" keyboardType="numeric" value={newItemQtyNum} onChangeText={setNewItemQtyNum} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: 10}}>
                                {standardUnits.map((u) => (
                                    <TouchableOpacity key={u} style={[styles.unitChip, newItemUnit === u && styles.unitChipSelected]} onPress={() => setNewItemUnit(u)}>
                                        <Text style={[styles.unitText, newItemUnit === u && styles.unitTextSelected]}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}><Text style={styles.addText}>Agregar</Text></TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Compras 🛒</Text>
                    <Text style={styles.subtitle}>{ingredients.length} items</Text>
                </View>
                {ingredients.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={clearList}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={ingredients}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={{fontSize: 50}}>📝</Text><Text style={styles.emptyText}>Lista vacía</Text></View>}
                renderItem={({ item }) => {
                    const isChecked = checkedItems[item.name];
                    return (
                        <TouchableOpacity style={[styles.row, isChecked && styles.rowChecked]} onPress={() => toggleCheck(item.name)}>
                            <Text style={[styles.name, isChecked && styles.textChecked]}>{item.name}</Text>
                            <View style={[styles.badge, isChecked && styles.badgeChecked]}>
                                <Text style={[styles.qty, isChecked && styles.textChecked]}>{isChecked ? "✅" : item.quantity}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20, paddingTop: 60 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 14, color: '#666' },
    clearBtn: { padding: 10, backgroundColor: '#ffebe6', borderRadius: 8 },
    row: { backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
    rowChecked: { backgroundColor: '#f0f0f0', elevation: 0 },
    name: { fontSize: 16, color: '#444', fontWeight: '500', maxWidth: '55%', textTransform: 'capitalize' },
    textChecked: { textDecorationLine: 'line-through', color: '#aaa' },
    badge: { backgroundColor: '#fff0e0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, maxWidth: '40%' },
    badgeChecked: { backgroundColor: 'transparent' },
    qty: { fontSize: 14, fontWeight: 'bold', color: '#FF6B00', textAlign: 'right' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#ccc', marginTop: 10 },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
    label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5, marginTop: 10 },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 10 },
    qtyRow: { flexDirection: 'row', alignItems: 'center' },
    unitChip: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#eee' },
    unitChipSelected: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
    unitText: { color: '#666', fontWeight: 'bold' },
    unitTextSelected: { color: '#fff' },
    modalButtons: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
    cancelButton: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10 },
    cancelText: { color: '#666', fontWeight: 'bold' },
    addButton: { flex: 1, backgroundColor: '#FF6B00', padding: 15, borderRadius: 10, alignItems: 'center' },
    addText: { color: '#fff', fontWeight: 'bold' }
});