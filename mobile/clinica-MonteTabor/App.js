import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useSplashTimer } from './src/hooks/useSplashTimer';
import SplashScreen from './src/screens/SplashScreen';
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
import AppointmentsScreen from './src/screens/appointments/AppointmentsScreen';
import AddMedicationScreen from './src/screens/medication/addMedicationScreen';
import NewAppointmentScreen from './src/screens/appointments/NewAppointmentScreen';
import PayAppointmentScreen from './src/screens/appointments/PayAppointmentScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import AppointmentDetailScreen from './src/screens/appointments/AppointmentDetailScreen';
import ConsultationDetailScreen from './src/screens/appointments/ConsultationDetailScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { isLoggedIn } = useAuth();

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
          {/* Dashboard/Appointments/Medications/Profile son las 4 pestañas de BottomNav: al
              cambiar entre ellas debe verse como un simple re-render (sin animación), no como
              un push de pantalla nueva. BottomNav navega con { tabSwitch: true }; cualquier otra
              navegación hacia estas mismas pantallas (ver NewAppointmentScreen,
              NotificationsScreen) pasa { tabSwitch: false } de forma explícita para no heredar
              por error un tabSwitch:true que haya quedado pegado de una navegación previa
              (React Navigation mezcla los params al volver a una pantalla ya existente en el
              stack). Esas SÍ deben animar: ahí es cuando el bottomBar se oculta/reaparece para
              una acción distinta, que es el único caso en el que la animación debe verse. */}
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={({ route }) => ({ animation: route.params?.tabSwitch ? "none" : "slide_from_right" })}
          />
          <Stack.Screen
            name="Appointments"
            component={AppointmentsScreen}
            options={({ route }) => ({ animation: route.params?.tabSwitch ? "none" : "slide_from_right" })}
          />
          <Stack.Screen name="NewAppointment" component={NewAppointmentScreen} />
          <Stack.Screen name="PayAppointment" component={PayAppointmentScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
          <Stack.Screen name="ConsultationDetail" component={ConsultationDetailScreen} />

          {/* ---------- Perfil ---------- */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={({ route }) => ({ animation: route.params?.tabSwitch ? "none" : "slide_from_right" })}
          />
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
          <Stack.Screen
            name="Medications"
            component={MedicationsScreen}
            options={({ route }) => ({ animation: route.params?.tabSwitch ? "none" : "slide_from_right" })}
          />
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

// Se monta dentro de AuthProvider: así el splash puede esperar a que isLoading
// (la revisión de la sesión guardada) termine, además del tiempo mínimo de useSplashTimer.
function AppContent() {
  const { isLoading } = useAuth();
  const showSplash = useSplashTimer(isLoading);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>

      <Toast config={toastConfig} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
