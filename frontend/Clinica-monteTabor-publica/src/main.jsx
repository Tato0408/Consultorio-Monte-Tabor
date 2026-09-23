import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installClickGuard } from './lib/preventDoubleClick'

// Se instala una sola vez, fuera del árbol de React (así no le afecta el doble-render de
// StrictMode en desarrollo). Ver el comentario del archivo para el porqué.
installClickGuard()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
