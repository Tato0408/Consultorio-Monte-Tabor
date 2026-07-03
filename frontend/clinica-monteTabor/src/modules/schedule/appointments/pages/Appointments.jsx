import React, { useState } from 'react';
import AppointmentsGrid from '../components/AppointmentsGrid';
import AppointmentsCalendar from '../components/AppointmentsCalendar';

// Pestañas de esta página: "Calendario" (vista semanal, AppointmentsCalendar)
// y "Citas" (el CRUD en tarjetas, AppointmentsGrid). Se monta solo el
// contenido de la pestaña activa (no las dos a la vez), para no tener dos
// fetches de citas corriendo al mismo tiempo en segundo plano.
const TABS = [
    { key: "calendar", label: "Calendario" },
    { key: "citas", label: "Citas" },
];

const AdminAppointments = () => {
    const [activeTab, setActiveTab] = useState("calendar");

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
