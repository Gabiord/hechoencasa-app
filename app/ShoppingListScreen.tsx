import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function ShoppingListScreen() { // <--- Cambia esto
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Aquí irá: Shopping List Screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    }
});

