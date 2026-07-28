import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ProfileScreen from './src/screens/profile/profileScreen';
import HealthInfoScreen from './src/screens/profile/healthInfoScreen';
import EditProfileScreen from './src/screens/profile/editProfileScreen';
import ListDetailScreen from './src/screens/profile/listDetailScreen';
import BloodTypeScreen from './src/screens/profile/bloodTypeScreen';
import OrganDonationScreen from './src/screens/profile/organDonationScreen';
import LifestyleScreen from './src/screens/profile/lifeStyleScreen';



const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />

        <Stack.Navigator
          initialRouteName="Profile"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#F4F6FA' },
          }}
        >
          <Stack.Screen name="ListDetail" component={ListDetailScreen} />
<Stack.Screen name="BloodType" component={BloodTypeScreen} />
<Stack.Screen name="OrganDonation" component={OrganDonationScreen} />
<Stack.Screen name="Lifestyle" component={LifestyleScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="HealthInfo" component={HealthInfoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}