import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { View } from 'react-native';

// Importamos tus pantallas
import HomeScreen from './HomeScreen';
import ShoppingListScreen from './ShoppingListScreen';
import SavedRecipesScreen from './SavedRecipesScreen';
import ProfileScreen from './ProfileScreen'; // <--- NUEVO IMPORT
import AddRecipeScreen from './AddRecipeScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Lista') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Guardados') {
            iconName = focused ? 'heart' : 'heart-outline';
          }
          // --- NUEVO ÍCONO PARA PERFIL ---
          else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // @ts-ignore
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 }
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Lista" component={ShoppingListScreen} />
      <Tab.Screen
        name="Publicar"
        component={AddRecipeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            // Hacemos el ícono un poco más grande y llamativo
            <View style={{
              top: -10, // Lo subimos un poquito
              width: 50, height: 50, borderRadius: 25,
              backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center',
              elevation: 5
            }}>
              <Ionicons name="add" size={30} color="white" />
            </View>
          ),
          tabBarLabel: () => null, // Ocultamos el texto para que se vea solo el botón
        }}
      />

      <Tab.Screen name="Guardados" component={SavedRecipesScreen} />
      {/* --- NUEVA PESTAÑA --- */}
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}