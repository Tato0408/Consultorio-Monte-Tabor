import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth, AuthProvider } from './context/AuthContext';
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';
import PatientsList from './modules/patients/pages/PatientsList';
import DoctorsList from './modules/doctors/pages/DoctorsList';
import InventoryDashboard from './modules/inventory/pages/InventoryDashboard';
import InventoryMovementsPage from './modules/inventory/pages/InventoryMovementsPage'
import TreatmentsPage from './modules/treatments/pages/TreatmentsPage';
import Login from './modules/login/pages/Login/Login';
import Register from './modules/login/pages/Register/Register';
import Recovery from './modules/login/pages/Recovery/Recovery';
import Verify from './modules/login/pages/Recovery/VerifyCode';
import PasswordUpdated from './modules/login/pages/Recovery/PasswordUpdated';
import Password from './modules/login/pages/Recovery/NewPassword';
import Consultations from './modules/schedule/consultations/pages/Consultations';
import ConsultationForm from './modules/schedule/consultations/pages/ConsultationForm';
import LabOrderForm from './modules/schedule/consultations/pages/LabOrderForm';
import Procedures from './modules//procedures/pages/ProceduresPage';
import ScheduleConfig from './modules/schedule/appointments/pages/ScheduleConfig';
import ProfilePage from './modules/profile/page/ProfilePage'
import RecepcionistList from './modules/recepcionist/pages/RecepcionistList'
import RolesPage from './modules/role/page/RolesPage';
import ReportsPatientsPage from './modules/reports/patients/pages/PatientsPage'
import ReportsDoctorsPage from './modules/reports/doctors/pages/DoctorPage'
import ReportAppointmentPage from './modules/reports/appointments/pages/AppointmentsPage'
import InventoryReportsPage from './modules/reports/inventory/pages/InventoryReportsPage'
import NursesPage from './modules/nurses/pages/NursePage'
import Appointments from "./modules/schedule/appointments/pages/Appointments"
import AppointmentsFormCalendar from './modules/schedule/appointments/components/AppointmentsFormCalendar';
import RecordsPage from './modules/reports/records/page/RecordsPage'
import NotFound from './modules/notFound/pages/NotFound';
import RequirePermission from './components/layouts/RequirePermission';
import RequireRole from './components/layouts/RequireRole';
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
        {/* "/home" y "/system/profile" quedan sin RequirePermission a propósito: su acceso
            está sembrado en TRUE para los 4 roles (dashboard/system.profile en seedRoles.js) y
            documentado como "siempre disponible, no depende de authorize()" — no hay permiso
            real que se les pueda quitar, así que envolverlas no protegería nada y sí arriesgaría
            dejar a alguien fuera de su propio panel/perfil por un dato inconsistente. */}
        <Route path="/home" element={<Home />} />
        <Route path="/users/patients" element={<RequirePermission moduleKey="users.patients"><PatientsList /></RequirePermission>} />
        <Route path="/users/doctors" element={<RequirePermission moduleKey="users.doctors"><DoctorsList /></RequirePermission>} />
        <Route path="/users/recepcionist" element={<RequirePermission moduleKey="users.receptionist"><RecepcionistList /></RequirePermission>} />
        <Route path="/calendar/appointments" element={<RequirePermission moduleKey="calendar.appointments"><Appointments /></RequirePermission>} />
        <Route path="/calendar/appointments/new" element={<RequirePermission moduleKey="calendar.appointments"><AppointmentsFormCalendar /></RequirePermission>} />
        <Route path="/calendar/appointments/:id" element={<RequirePermission moduleKey="calendar.appointments"><AppointmentsFormCalendar /></RequirePermission>} />
        <Route path="/calendar/consultations" element={<RequirePermission moduleKey="calendar.consultations"><Consultations /></RequirePermission>} />
        <Route path="/calendar/consultations/:appointmentId" element={<RequirePermission moduleKey="calendar.consultations"><ConsultationForm /></RequirePermission>} />
        <Route path="/calendar/consultations/:appointmentId/lab-order" element={<RequirePermission moduleKey="calendar.consultations"><LabOrderForm /></RequirePermission>} />
        <Route path="/calendar/schedule-config" element={<RequirePermission moduleKey="calendar.schedule"><RequireRole roles={["doctor", "nurse", "admin"]}><ScheduleConfig /></RequireRole></RequirePermission>} />
        <Route path="/inventory/products" element={<RequirePermission moduleKey="inventory.products"><InventoryDashboard /></RequirePermission>} />
        <Route path="/inventory/movements" element={<RequirePermission moduleKey="inventory.movements"><InventoryMovementsPage /></RequirePermission>} />
        <Route path="/inventory/treatments" element={<RequirePermission moduleKey="inventory.treatments"><TreatmentsPage /></RequirePermission>} />
        <Route path="/procedures" element={<RequirePermission moduleKey="procedures"><Procedures /></RequirePermission>} />
        <Route path="/system/profile" element={<ProfilePage />} />
        <Route path="/system/privileges" element={<RequirePermission moduleKey="system.roles"><RolesPage /></RequirePermission>} />
        <Route path="/reports/appointments" element={<RequirePermission moduleKey="reports.appointments"><ReportAppointmentPage /></RequirePermission>} />
        <Route path="/reports/patients" element={<RequirePermission moduleKey="reports.patients"><ReportsPatientsPage /></RequirePermission>} />
        <Route path="/reports/doctors" element={<RequirePermission moduleKey="reports.doctors"><ReportsDoctorsPage /></RequirePermission>} />
        <Route path="/users/nurses" element={<RequirePermission moduleKey="users.nurses"><NursesPage /></RequirePermission>} />
        <Route path="/reports/records" element={<RequirePermission moduleKey="reports.records"><RecordsPage /></RequirePermission>} />
        <Route path="/inventory/reports" element={<RequirePermission moduleKey="inventory.reports"><InventoryReportsPage /></RequirePermission>} />
      </Route>
      <Route path="/system/profile" element={<ProfilePage />} />

      {/* Cualquier ruta que no coincida con ninguna de las anteriores cae aquí.
          Las rutas que SÍ existen siguen su comportamiento normal (incluyendo
          redirecciones por falta de autenticación); esto solo cubre URLs inexistentes. */}
      <Route path="*" element={<NotFound />} />
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
