import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';

import Toast from 'react-native-toast-message';
import { toastConfig } from './src/lib/toast';

import LoginScreen from './src/screens/login/loginScreens/LoginScreen';
import RegisterScreen from './src/screens/login/loginScreens/RegisterScreen';
import RecoveryScreen from './src/screens/login/RecoveryScreens/RecoveryScreen';
import VerifyCodeScreen from './src/screens/login/RecoveryScreens/VerifyCodeScreen';
import NewPasswordScreen from './src/screens/login/RecoveryScreens/NewPasswordScreen';
import PasswordUpdatedScreen from './src/screens/login/RecoveryScreens/PasswordUpdatedScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import MedicationsScreen from './src/screens/MedicationsScreen';
import ProfileScreen from './src/screens/profile/profileScreen';
import HealthInfoScreen from './src/screens/profile/healthInfoScreen';
import EditProfileScreen from './src/screens/profile/editProfileScreen';
import ChangePasswordScreen from './src/screens/profile/changePasswordScreen';
import ListDetailScreen from './src/screens/profile/listDetailScreen';
import BloodTypeScreen from './src/screens/profile/bloodTypeScreen';
import OrganDonationScreen from './src/screens/profile/organDonationScreen';
import LifestyleScreen from './src/screens/profile/lifeStyleScreen';

const Stack = createNativeStackNavigator();

// Decide qué pantallas existen según el estado de la sesión.
// Al cambiar isLoggedIn, React Navigation hace el switch solo: no navegues manualmente.
function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  // Mientras validamos el token guardado, mostramos un splash
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6FA' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F4F6FA' },
      }}
    >
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Appointments" component={AppointmentsScreen} />
          <Stack.Screen name="Medications" component={MedicationsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="HealthInfo" component={HealthInfoScreen} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} />
          <Stack.Screen name="BloodType" component={BloodTypeScreen} />
          <Stack.Screen name="OrganDonation" component={OrganDonationScreen} />
          <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Recovery" component={RecoveryScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
          <Stack.Screen name="PasswordUpdated" component={PasswordUpdatedScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
         <Toast config={toastConfig} topOffset={60} />
      </SafeAreaProvider>
    </AuthProvider>
  );
}