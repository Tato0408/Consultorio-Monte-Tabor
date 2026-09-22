import { useRef } from "react";
import { View } from "react-native";

// Guard global anti-doble-tap: en vez de tocar cada uno de los ~130 TouchableOpacity de la
// app (no hay un componente de botón compartido en uso), se envuelve toda la app una sola
// vez en una vista raíz que reclama el toque ANTES que cualquier TouchableOpacity
// descendiente lo reciba (onStartShouldSetResponderCapture es el equivalente en React
// Native a la fase de captura de eventos del DOM en la web).
//
// Es un debounce por posición (bloquea repetir un toque en el mismo lugar muy rápido), no
// un "deshabilitar hasta que la petición termine": eso exigiría tocar cada handler async
// uno por uno, que es justo lo que este enfoque evita.
const COOLDOWN_MS = 700;
const RADIUS_PX = 40;

const GlobalTouchGuard = ({ children }) => {
  const lastTouch = useRef({ x: 0, y: 0, time: 0 });

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={(evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const now = Date.now();
        const { x, y, time } = lastTouch.current;
        const cerca = Math.hypot(pageX - x, pageY - y) < RADIUS_PX;
        const reciente = now - time < COOLDOWN_MS;

        if (cerca && reciente) {
          // Captura este toque y lo bloquea: no llega al TouchableOpacity de abajo.
          return true;
        }

        lastTouch.current = { x: pageX, y: pageY, time: now };
        // No lo captura: el toque sigue su curso normal hacia el hijo tocado.
        return false;
      }}
    >
      {children}
    </View>
  );
};

export default GlobalTouchGuard;
