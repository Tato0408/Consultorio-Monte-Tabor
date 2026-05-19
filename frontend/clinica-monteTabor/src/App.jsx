import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';

import AdminLogin from './modules/login/pages/AdminLogin';
import DoctorLogin from './modules/login/pages/DoctorLogin';
import RecepcionistLogin from './modules/login/pages/RecepcionistLogin';
import NurseLogin from './modules/login/pages/NurseLogin';

function App() {
  return (
    <>
    {/*BrowserRouter sirve para cambiar de página en la web usando la barra de arriba, pero sin que la pantalla se trabe o parpadee al cargar*/}
      <BrowserRouter>

        <Routes>
          {/* Rutas sin sidebar*/}
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/doctor" element={<DoctorLogin />} />
          <Route path="/login/receptionist" element={<RecepcionistLogin />} />
          <Route path="/login/nurse" element={<NurseLogin />} />
          <Route element={<MainLayout/>}>
            <Route path="/home" element={<Home />} />
          </Route>
          {/*Cambiar a login despues ahorita esta para codear asi*/}
          <Route path="*" element={<Navigate to="/home" replace />} />

        </Routes>



      </BrowserRouter>


    </>
  )
}

export default App
