import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './modules/login/pages/login/Login';
import Register from './modules/login/pages/register/Register';
import VerifyEmail from './modules/login/pages/register/VerifyEmail';
import Dashboard from './modules/dashboard/pages/Dashboard';
import Home from './modules/home/pages/Home';
import PatientAppointments from './modules/appointments/pages/PatientAppointments';
import PatientAppointmentForm from './modules/appointments/pages/PatientAppointmentForm';

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
          <Route path="/appointments" element={<ProtectedRoute><PatientAppointments /></ProtectedRoute>} />
          <Route path="/appointments/new" element={<ProtectedRoute><PatientAppointmentForm /></ProtectedRoute>} />
          <Route path="/appointments/:id/edit" element={<ProtectedRoute><PatientAppointmentForm /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
