import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router no resetea el scroll al cambiar de ruta por su cuenta (a diferencia de
// un sitio tradicional de varias páginas): sin esto, entrar a una pantalla nueva
// después de haber scrolleado hacia abajo en la anterior mantenía esa misma posición
// en vez de empezar siempre arriba. Se monta una sola vez, dentro de <BrowserRouter>.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
