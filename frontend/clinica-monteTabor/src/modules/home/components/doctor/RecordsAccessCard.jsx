import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderOpen, ChevronRight } from "lucide-react";

// Formatea una fecha en formato dd/mm/aa. Devuelve cadena vacía si no
// recibe fecha.
const fmtDate = (raw) => {
    if (!raw) return "";
    const d = new Date(raw);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
};

// Genera un código de expediente a partir de los últimos seis
// caracteres del id de la cita, con el prefijo OPD.
const recordCode = (apptId) => {
    const str = String(apptId || "").slice(-6).toUpperCase();
    return `OPD-${str}`;
};

const RecordsAccessCard = ({ records = [] }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");

    const filtered = records.filter((r) => {
        const name = `${r.patient?.name || ""} ${r.patient?.last_name || ""}`.toLowerCase();
        return name.includes(query.toLowerCase());
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">Acceso a expedientes</p>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar expediente..."
                    maxLength={100}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
            </div>

            {/* Lista de expedientes */}
            <div className="flex flex-col gap-0">
                {filtered.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                        {query ? "Sin resultados" : "Sin expedientes"}
                    </p>
                ) : (
                    filtered.map((r) => {
                        const patName = `${r.patient?.name || ""} ${r.patient?.last_name || ""}`.trim();
                        return (
                            <div key={r._id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <FolderOpen className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{patName}</p>
                                    <p className="text-xs text-slate-400">
                                        {recordCode(r.appointmentId)} · {fmtDate(r.lastVisit)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate("/users/patients")}
                                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                                >
                                    Abrir
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pie con acceso a todos los expedientes */}
            <button
                onClick={() => navigate("/users/patients")}
                className="flex items-center justify-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-auto pt-2 border-t border-slate-50"
            >
                Ver todos los expedientes <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

export default RecordsAccessCard;
