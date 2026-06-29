import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext'; // Importamos useAuth
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';
import PatientsList from './modules/patients/pages/PatientsList';
import DoctorsList from './modules/doctors/pages/DoctorsList';
import InventoryDashboard from './modules/inventory/pages/InventoryDashboard';
import Login from './modules/login/pages/Login/Login';
import Register from './modules/login/pages/Register/Register';
import Recovery from './modules/login/pages/Recovery/Recovery';
import Verify from './modules/login/pages/Recovery/VerifyCode';
import PasswordUpdated from './modules/login/pages/Recovery/PasswordUpdated';
import Password from './modules/login/pages/Recovery/NewPassword';
import Consultations from './modules/schedule/consultations/pages/Consultations';
import ConsultationForm from './modules/schedule/consultations/pages/ConsultationForm';
import Procedures from './modules//procedures/pages/ProceduresPage';
import AdminAppointments from './modules/appointments/pages/AdminAppointments';
import CreateAppointmentForm from './modules/appointments/components/AppointmentsForm'
import ProfilePage from './modules/profile/page/ProfilePage'
import RecepcionistList from './modules/recepcionist/pages/RecepcionistList' 

function AppRoutes() {
  const { isLoading, hasAdmins } = useAuth();

  // Pantalla de carga preventiva mientras se resuelven las comprobaciones del backend
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-[#3B6FCA]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-500 font-medium text-sm">Cargando módulos de seguridad...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Si NO HAY admins, la raíz manda a registrar, si SÍ HAY va al login */}
      <Route path="/" element={<Navigate to={hasAdmins ? "/login" : "/register"} replace />} />
      
      {/* Rutas sin sidebar */}
      <Route 
        path="/login" 
        element={hasAdmins ? <Login /> : <Navigate to="/register" replace />} 
      />
      
      {/* Escudo de Protección: Si hay administradores registrados, bloquea permanentemente el acceso al formulario de registro */}
      <Route 
        path="/register" 
        element={hasAdmins ? <Navigate to="/login" replace /> : <Register />} 
      />
      
      <Route path="/recovery" element={<Recovery />} />
      <Route path="/verify-code" element={<Verify />} />
      <Route path="/new-password" element={<Password />} />
      <Route path="/password-updated" element={<PasswordUpdated />} />

      {/* Rutas Protegidas bajo Sidebar */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/users/patients" element={<PatientsList />} />
        <Route path="/users/doctors" element={<DoctorsList />} />
        <Route path="/users/recepcionist" element={<RecepcionistList />} />
        <Route path="/calendar/consultations" element={<Consultations />} />
        <Route path="/calendar/consultations/:appointmentId" element={<ConsultationForm />} />
        <Route path="/calendar/appointments" element={<AdminAppointments/>} />
        <Route path="/calendar/appointments/new" element={<CreateAppointmentForm />} />
        <Route path="/calendar/appointments/:id" element={<CreateAppointmentForm />} />
        <Route path="/inventory/products" element={<InventoryDashboard />} />
        <Route path="/procedures" element={<Procedures />} />
        <Route path="/system/profile" element={<ProfilePage/>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;