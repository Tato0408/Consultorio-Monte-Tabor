import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppointmentsGrid from '../components/AppointmentsGrid';
import AppointmentsCalendar from '../components/AppointmentsCalendar';

// Pestañas de esta página: Calendario (vista semanal,
// AppointmentsCalendar) y Citas (el CRUD en tarjetas,
// AppointmentsGrid). Se monta solo el contenido de la pestaña activa
// (no las dos a la vez), para no tener dos fetches de citas corriendo
// al mismo tiempo en segundo plano.
const TABS = [
    { key: "calendar", label: "Calendario" },
    { key: "citas", label: "Citas" },
];

const AdminAppointments = () => {
    const location = useLocation();
    // El link de una notificación (action_url guardado en Mongo) es un string
    // simple: no puede llevar el "state" de React Router, así que ese caso usa el
    // query param ?view= en vez de location.state. Se revisa primero porque, a
    // diferencia de location.state, sigue funcionando aunque la navegación no
    // venga de dentro de la SPA (ej. abrir el link en una pestaña nueva).
    // Al volver del detalle de una cita (botón de cerrar de
    // AppointmentsFormCalendar.jsx), location.state.initialView indica
    // desde qué pestaña se abrió esa cita (calendar o citas). Sin esto,
    // este componente siempre remonta con useState("calendar") y el
    // usuario termina de vuelta en el Calendario aunque hubiera abierto
    // la cita desde Citas.
    // El query param ?view= es la misma idea pero para llegar desde afuera
    // (ej. el action_url de la notificación "Nueva cita por aceptar", que
    // manda aquí en vez del detalle de una cita puntual sin doctor todavía).
    const initialView = location.state?.initialView || new URLSearchParams(location.search).get("view") || "calendar";
    const [activeTab, setActiveTab] = useState(initialView);

    // Este componente no remonta al aceptar una cita desde Citas y saltar al
    // Calendario para verla ya programada (misma ruta, /calendar/appointments,
    // solo cambia location.state) — así que el useState de arriba, que solo
    // corre al montar, no alcanza para esos saltos en caliente. location.key
    // cambia en cada navegación nueva (aunque la ruta sea la misma), así que
    // sirve para detectar ese caso y releer la vista pedida.
    useEffect(() => {
        const view = location.state?.initialView || new URLSearchParams(location.search).get("view");
        if (view) setActiveTab(view);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);

    return (
        <div className="w-full h-full flex flex-col">
            {/* Tabs */}
            <div className="border-b border-slate-100 flex gap-4 md:gap-6 text-sm font-medium px-8 pt-4 bg-[#f8fafc] flex-shrink-0">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`pb-3 whitespace-nowrap transition-all relative flex-shrink-0 ${activeTab === tab.key
                            ? "text-blue-600 font-semibold border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === "calendar" ? <AppointmentsCalendar /> : <AppointmentsGrid />}
            </div>
        </div>
    );
};

export default AdminAppointments;
