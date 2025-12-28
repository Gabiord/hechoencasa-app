import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importamos tus pantallas
import HomeScreen from './HomeScreen';
import ShoppingListScreen from './ShoppingListScreen';
import SavedRecipesScreen from './SavedRecipesScreen';
import ProfileScreen from './ProfileScreen'; // <--- NUEVO IMPORT

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
      <Tab.Screen name="Guardados" component={SavedRecipesScreen} />
      {/* --- NUEVA PESTAÑA --- */}
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}