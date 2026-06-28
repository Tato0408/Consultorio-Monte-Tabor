import { Outlet, Navigate } from "react-router-dom";
import SideBar from "./SideBar";
import {useAuth} from "../../context/AuthContext"
const MainLayout = () => {
    const { isLoggedIn, isLoading} = useAuth()
    // Mientras verifica la sesión no hace nada
    if (isLoading) return null;

    // Si no hay sesión activa redirige al login
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    return (
        <>
            <div className="flex h-screen bg-slate-50 overflow-hidden">

                <SideBar />

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                    <main className="flex-1 overflow-y-auto p-6 relative">
                        {/* El Outlet es donde se renderizarán las páginas de los módulos */}
                        <Outlet />
                    </main>
                </div>

            </div>

        </>
    );
}
export default MainLayout