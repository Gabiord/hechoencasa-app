import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from './HomeScreen';
import SavedRecipesScreen from './SavedRecipesScreen';
import ShoppingListScreen from './ShoppingListScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs(){
    return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Recetas" component={SavedRecipesScreen} />
      <Tab.Screen name="Lista" component={ShoppingListScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
    )
}

