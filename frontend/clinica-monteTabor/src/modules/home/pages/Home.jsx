import AdminDashboard from "./AdminDashboard";
import DoctorDashboard from "./DoctorDashboard";
import RecepcionistDashboard from "./RecepcionistDashboard";
import NurseDashboard from "./NurseDashboard";
import { useAuth } from "@/context/AuthContext";

const Home = () => {
    const { userType } = useAuth();

    if (userType === "admin")        return <AdminDashboard />;
    if (userType === "doctor")       return <DoctorDashboard />;
    if (userType === "receptionist") return <RecepcionistDashboard />;
    if (userType === "nurse")        return <NurseDashboard />;

    return <div className="p-8 text-slate-400 text-sm">Cargando Dashboard...</div>;
};

export default Home;
