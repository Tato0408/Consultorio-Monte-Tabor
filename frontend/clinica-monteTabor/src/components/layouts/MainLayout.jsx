import { Outlet } from "react-router-dom";
import SideBar from "./SideBar";

const MainLayout = () => {
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