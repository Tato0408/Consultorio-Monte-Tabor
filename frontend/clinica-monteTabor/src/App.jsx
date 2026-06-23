import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';
import PatientsList from './modules/patients/pages/PatientsList';
import DoctorsList from './modules/doctors/pages/DoctorsList';
import InventoryDashboard from './modules/inventory/pages/InventoryDashboard';
import Login from './modules/login/pages/Login/Login';
import Register from './modules/login/pages/Register/Register';
import Consultations from './modules/schedule/pages/Consultations';

import AdminAppointments from './modules/appointments/pages/AdminAppointments';
import CreateAppointmentForm from './modules/appointments/components/AppointmentsForm'

function App() {
  return (
    <>
      {/*BrowserRouter sirve para cambiar de página en la web usando la barra de arriba, pero sin que la pantalla se trabe o parpadee al cargar*/}
      <BrowserRouter>

        <Routes>
          {/* Rutas sin sidebar*/}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<MainLayout/>}>
            <Route path="/home" element={<Home />} />
            <Route path="/users/patients" element={<PatientsList />} />
            <Route path="/users/doctors" element={<DoctorsList />} />

            <Route path="/calendar/consultations" element={<Consultations />} />

            <Route path="/inventory/products" element={<InventoryDashboard />} />

          </Route>
          {/*Cambiar a login despues ahorita esta para codear asi*/}
          <Route path="*" element={<Navigate to="/users/patients" replace />} />
            <Route element={<MainLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/users/patients" element={<PatientsList />} />

              <Route path="/calendar/appointments" element={<AdminAppointments />} />
              <Route path="/calendar/appointments/new" element={<CreateAppointmentForm />} />
              <Route path="/calendar/appointments/:id" element={<CreateAppointmentForm />} />
            </Route>
            {/*Cambiar a login despues ahorita esta para codear asi*/}
            <Route path="*" element={<Navigate to="/users/patients" replace />} />
          <Route path="*" element={<Navigate to="/inventory/products" replace />} />


        </Routes>



      </BrowserRouter>


    </>
  )
}

export default App
