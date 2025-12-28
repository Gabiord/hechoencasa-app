import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './LoginScreen';
import MainTabs from './MainTabs';
import RegisterScreen from './RegisterScreen';

import RecipeDetailScreen from './RecipeDetailScreen'; // <--- Importamos

const Stack = createNativeStackNavigator ();

export default function App(){
  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen}/>
        <Stack.Screen name="RegistrerScreen" component={RegisterScreen}/>
        <Stack.Screen name="MainTabs" component={MainTabs}/>
        <Stack.Screen 
         name="RecipeDetailScreen" 
         component={RecipeDetailScreen} 
         options={{ title: 'Detalle de la Receta' }} // Opcional: ponerle título
       />
      </Stack.Navigator>
  )
}