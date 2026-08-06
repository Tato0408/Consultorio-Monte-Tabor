import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './modules/login/pages/login/Login';
import Register from './modules/login/pages/register/Register';
import VerifyEmail from './modules/login/pages/register/VerifyEmail';
import Dashboard from './modules/dashboard/pages/Dashboard';
import Home from './modules/home/pages/Home';
import NewAppointment from './modules/appointments/pages/NewAppointment';
import MyAppointments from './modules/appointments/pages/MyAppointments';
import PayAppointment from './modules/appointments/pages/PayAppointment';
import Prescriptions from './modules/records/pages/Prescriptions';
import Documents from './modules/records/pages/Documents';
import Medications from './modules/records/pages/Medications';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/verify" element={<VerifyEmail />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agendar-cita"
            element={
              <ProtectedRoute>
                <NewAppointment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agendar-cita/pagar"
            element={
              <ProtectedRoute>
                <PayAppointment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mis-citas"
            element={
              <ProtectedRoute>
                <MyAppointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mis-recetas"
            element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documentos"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicamentos"
            element={
              <ProtectedRoute>
                <Medications />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
