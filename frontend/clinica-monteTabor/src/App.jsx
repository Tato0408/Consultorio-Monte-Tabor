import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';
import PatientsList from './modules/patients/pages/PatientsList';
import DoctorsList from './modules/doctors/pages/DoctorsList';
import Login from './modules/login/pages/Login/Login';
import Register from './modules/login/pages/Register/Register';
import Recovery from './modules/login/pages/Recovery/Recovery';
import Verify from './modules/login/pages/Recovery/VerifyCode';
import PasswordUpdated from './modules/login/pages/Recovery/PasswordUpdated';
import Password from './modules/login/pages/Recovery/NewPassword';

function App() {
  return (
    <>
    {/*BrowserRouter sirve para cambiar de página en la web usando la barra de arriba, pero sin que la pantalla se trabe o parpadee al cargar*/}
      <BrowserRouter>

        <Routes>
          {/* Rutas sin sidebar*/}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/verify-code" element={<Verify />} />
          <Route path="/new-password" element={<Password />} />
          <Route path="/password-updated" element={<PasswordUpdated />} />
          



          <Route element={<MainLayout/>}>
            <Route path="/home" element={<Home />} />
            <Route path="/users/patients" element={<PatientsList />} />
            <Route path="/users/doctors" element={<DoctorsList />} />
          </Route>
          {/*Cambiar a login despues ahorita esta para codear asi*/}
          <Route path="*" element={<Navigate to="/users/patients" replace />} />


        </Routes>



      </BrowserRouter>


    </>
  )
}

export default App
