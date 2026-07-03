import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth, AuthProvider } from './context/AuthContext';
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
import ScheduleConfig from './modules/schedule/appointments/pages/ScheduleConfig';
import ProfilePage from './modules/profile/page/ProfilePage'
import RecepcionistList from './modules/recepcionist/pages/RecepcionistList'
import RolesPage from './modules/role/page/RolesPage';
import ReportsPatientsPage from './modules/reports/patients/pages/PatientsPage'
import ReportsDoctorsPage from './modules/reports/doctors/pages/DoctorPage'
import ReportAppointmentPage from './modules/reports/appointments/pages/AppointmentsPage'
import NursesPage from './modules/nurses/pages/NursePage'
import Appointments from "./modules/schedule/appointments/pages/Appointments"
import AppointmentsForm from './modules/schedule/appointments/components/AppointmentsForm';
import AppointmentsFormCalendar from './modules/schedule/appointments/components/AppointmentsFormCalendar';
import RecordsPage from './modules/reports/records/page/RecordsPage'
function AppRoutes() {
  const { isLoading, hasAdmins } = useAuth();

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
      <Route path="/" element={<Navigate to={hasAdmins ? "/login" : "/register"} replace />} />

      <Route
        path="/login"
        element={hasAdmins ? <Login /> : <Navigate to="/register" replace />}
      />

      <Route
        path="/register"
        element={hasAdmins ? <Navigate to="/login" replace /> : <Register />}
      />

      <Route path="/recovery" element={<Recovery />} />
      <Route path="/verify-code" element={<Verify />} />
      <Route path="/new-password" element={<Password />} />
      <Route path="/password-updated" element={<PasswordUpdated />} />

      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/users/patients" element={<PatientsList />} />
        <Route path="/users/doctors" element={<DoctorsList />} />
        <Route path="/users/recepcionist" element={<RecepcionistList />} />
        <Route path="/calendar/appointments" element={<Appointments />} />
        <Route path="/calendar/appointments/new" element={<AppointmentsForm />} />
        <Route path="/calendar/appointments/:id" element={<AppointmentsForm />} />
        <Route path="/calendar/appointments/calendar/new" element={<AppointmentsFormCalendar />} />
        <Route path="/calendar/appointments/calendar/:id" element={<AppointmentsFormCalendar />} />
        <Route path="/calendar/consultations" element={<Consultations />} />
        <Route path="/calendar/consultations/:appointmentId" element={<ConsultationForm />} />
        <Route path="/calendar/schedule-config" element={<ScheduleConfig />} />
        <Route path="/inventory/products" element={<InventoryDashboard />} />
        <Route path="/procedures" element={<Procedures />} />
        <Route path="/system/profile" element={<ProfilePage />} />
        <Route path="/system/privileges" element={<RolesPage />} />
        <Route path="/reports/appointments" element={<ReportAppointmentPage />} />
        <Route path="/reports/patients" element={<ReportsPatientsPage />} />
        <Route path="/reports/doctors" element={<ReportsDoctorsPage />} />
        <Route path="/users/nurses" element={<NursesPage />} />
        <Route path="/reports/records" element={<RecordsPage/>}/>
      </Route>
      <Route path="/system/profile" element={<ProfilePage />} />
    </Routes >
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
