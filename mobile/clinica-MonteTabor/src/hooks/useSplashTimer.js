import { useEffect, useState } from "react";

const SPLASH_MIN_DURATION_MS = 3000;

// Mantiene el splash visible al menos SPLASH_MIN_DURATION_MS, y más tiempo si
// isBooting (la revisión de sesión guardada) todavía no termina.
export function useSplashTimer(isBooting) {
    const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMinimumTimeElapsed(true), SPLASH_MIN_DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    return isBooting || !minimumTimeElapsed;
}
