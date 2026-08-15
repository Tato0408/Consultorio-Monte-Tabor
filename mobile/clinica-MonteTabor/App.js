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


import ProfileScreen from './src/screens/profile/profileScreen';
import EditProfileScreen from './src/screens/profile/editProfileScreen';
import ChangePasswordScreen from './src/screens/profile/changePasswordScreen';
import ListDetailScreen from './src/screens/profile/listDetailScreen';
import HealthInfoScreen from './src/screens/profile/healthInfoScreen';
import BloodTypeScreen from './src/screens/profile/bloodTypeScreen';
import AddBloodTypeScreen from './src/screens/profile/addBloodTypeScreen';
import AddHereditaryScreen from './src/screens/profile/addHederitaryScreen';
import AddPathologicalScreen from './src/screens/profile/addPathologicalScreen';
import LifestyleScreen from './src/screens/profile/lifeStyleScreen';

import MedicationsScreen from './src/screens/medication/medicationScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import AddMedicationScreen from './src/screens/medication/addMedicationScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

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

          {/* ---------- Perfil ---------- */}
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="ListDetail" component={ListDetailScreen} />

          {/* ---------- Historia clínica ----------
              El "name" es el string que reciben los navigation.navigate(): tiene que
              coincidir letra por letra, por eso van sin el sufijo "Screen". */}
          <Stack.Screen name="HealthInfo" component={HealthInfoScreen} />
          <Stack.Screen name="BloodType" component={BloodTypeScreen} />
          <Stack.Screen name="AddBloodType" component={AddBloodTypeScreen} />
          <Stack.Screen name="AddHereditary" component={AddHereditaryScreen} />
          <Stack.Screen name="AddPathological" component={AddPathologicalScreen} />
          <Stack.Screen name="Lifestyle" component={LifestyleScreen} />

          {/* ---------- Medicamentos ---------- */}
          <Stack.Screen name="Medications" component={MedicationsScreen} />
          <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
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
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />

          <RootNavigator />
        </NavigationContainer>

        <Toast config={toastConfig} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}