import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';
import Home from './modules/home/pages/Home';

import Login from './modules/login/pages/Login/Login';
import Register from './modules/login/pages/Register/Register';

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
          </Route>
          {/*Cambiar a login despues ahorita esta para codear asi*/}
          <Route path="*" element={<Navigate to="/home" replace />} />


        </Routes>



      </BrowserRouter>


    </>
  )
}

export default App
