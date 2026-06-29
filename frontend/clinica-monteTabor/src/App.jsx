import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <>
      {/*BrowserRouter sirve para cambiar de página en la web usando la barra de arriba, pero sin que la pantalla se trabe o parpadee al cargar*/}
      <AuthProvider>
        <BrowserRouter>

          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            {/* Rutas sin sidebar*/}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/verify-code" element={<Verify />} />
            <Route path="/new-password" element={<Password />} />
            <Route path="/password-updated" element={<PasswordUpdated />} />

            <Route element={<MainLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/users/patients" element={<PatientsList />} />
              <Route path="/users/doctors" element={<DoctorsList />} />
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
        </BrowserRouter>
      </AuthProvider>
    </>
  )
}

export default App
