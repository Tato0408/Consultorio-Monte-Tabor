import React from "react";
import AdminDashboard from "./AdminDashboard";
import DoctorDashboard from "./DoctorDashboard";
import RecepcionistDashboard from "./RecepcionistDashboard";
import NurseDashboard from "./NurseDashboard";

const Home = () =>{
    const userRole = "admin"

    if(userRole === "admin") return <AdminDashboard/>

    if(userRole === "doctor") return <DoctorDashboard/>

    if(userRole === "receptionist") return <RecepcionistDashboard/>

    if(userRole === "nurse") return <NurseDashboard/>

    return (
        <>
        <div>Cargando Dashboard...</div>;
        </>
    )
}
export default Home
