import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/login/pages/login/login';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />}></Route>

          <Route path="/login" element={<Login />}></Route>
        </Routes>

      </BrowserRouter>
    </>
  )
}

export default App
