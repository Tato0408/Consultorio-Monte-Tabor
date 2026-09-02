import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Users, UserCheck, CalendarCheck } from "lucide-react";
import useRecords from "../hooks/useRecords";
import RecordsTable from "../components/RecordsTable";
import RecordDetailPage from "../components/RecordDetailPage";

// Chip de resumen que se muestra superpuesto al borde inferior del banner.
const CHIP_TINTS = {
  blue: "bg-[#EAF1FD] text-[#3B6FCA]",
  emerald: "bg-[#E6F6EF] text-[#1E9E63]",
  teal: "bg-teal-50 text-teal-600",
};

const StatChip = ({ icon, tint, value, label }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-[0_10px_26px_-12px_rgba(15,23,42,0.18)]">
    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${CHIP_TINTS[tint]}`}>
      {icon}
    </div>
    <div className="leading-none">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-[11.5px] text-slate-400">{label}</p>
    </div>
  </div>
);

const RecordsPage = () => {
  const location = useLocation();
  const { records, loading, error, getRecordById, refetch } = useRecords();
  const [selectedId, setSelectedId] = useState(null);

  // Números de los chips del banner. Se derivan de los mismos registros que
  // llenan la tabla, sin una petición aparte.
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: records.length,
      activos: records.filter((r) => r.activo).length,
      visitasMes: records.filter(
        (r) =>
          r.ultimaVisita &&
          r.ultimaVisita.getMonth() === now.getMonth() &&
          r.ultimaVisita.getFullYear() === now.getFullYear()
      ).length,
    };
  }, [records]);

  // selectPatientId (puesto por RecordsAccessCard.jsx del dashboard del doctor al hacer clic en
  // "Abrir") abre directamente el expediente de ese paciente, igual que si se hubiera hecho
  // clic en su fila dentro de esta misma pantalla.
  useEffect(() => {
    const wanted = location.state?.selectPatientId;
    if (wanted && !loading && records.some((r) => r.id === wanted)) {
      setSelectedId(wanted);
    }
  }, [location.state, loading, records]);

  // Renderizado tipo SPA: en lugar de navegar a una ruta nueva, esta misma
  // página intercambia entre el listado y el expediente del paciente
  // seleccionado, tomando siempre la info de ese paciente puntual.
  if (selectedId) {
    return (
      <RecordDetailPage
        record={getRecordById(selectedId)}
        onBack={() => setSelectedId(null)}
        // getRecordById deriva del arreglo patients que trae useRecords, así que
        // refrescarlo aquí (y no solo usePatientRecordDetail, que trae aparte
        // las consultas, las citas y las incapacidades) es lo que hace que los
        // datos del propio documento del paciente (nombre, tipo de sangre,
        // antecedentes, signos vitales, procedimientos) se reflejen después de
        // guardar un modal.
        onPatientUpdated={refetch}
      />
    );
  }

  return (
    <div className="px-4 sm:px-10 py-6 sm:py-8 text-slate-800">
      {/* Banner inmersivo: degradado del azul de marca hacia turquesa */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0b66d6] via-[#1c7fd0] to-[#0d9488] px-6 py-7 text-white shadow-[0_22px_44px_-20px_rgba(11,102,214,0.55)] sm:px-8 sm:pb-9">
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-white/80">
          Expediente Clínico
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[29px]">
          Expedientes de pacientes
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/90">
          Historia clínica centralizada de la clínica. Da clic en un paciente para abrir su
          expediente completo.
        </p>
      </div>

      {/* Chips de resumen, superpuestos al borde inferior del banner */}
      <div className="relative z-10 -mt-6 grid grid-cols-1 gap-3.5 px-1 sm:-mt-7 sm:grid-cols-3 sm:px-2">
        <StatChip
          icon={<Users className="h-5 w-5" strokeWidth={2} />}
          tint="blue"
          value={loading ? "—" : stats.total}
          label="Pacientes"
        />
        <StatChip
          icon={<UserCheck className="h-5 w-5" strokeWidth={2} />}
          tint="emerald"
          value={loading ? "—" : stats.activos}
          label="Activos"
        />
        <StatChip
          icon={<CalendarCheck className="h-5 w-5" strokeWidth={2} />}
          tint="teal"
          value={loading ? "—" : stats.visitasMes}
          label="Visitas este mes"
        />
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6">
        <RecordsTable
          records={records}
          loading={loading}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>
    </div>
  );
};

export default RecordsPage;
