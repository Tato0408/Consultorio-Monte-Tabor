import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import useRecords from "../hooks/useRecords";
import RecordsTable from "../components/RecordsTable";
import RecordDetailPage from "../components/RecordDetailPage";
import TablePagination from "@/components/ui/TablePagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RecordsPage = () => {
  const location = useLocation();
  const { records, loading, error, getRecordById, refetch } = useRecords();
  const [selectedId, setSelectedId] = useState(null);

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
      <h1 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-normal text-slate-400">
        Expedientes de pacientes
      </h1>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      <RecordsTable
        records={records}
        loading={loading}
        onRowClick={(row) => setSelectedId(row.id)}
      />
    </div>
  );
};

export default RecordsPage;
