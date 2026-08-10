import { useState } from "react";
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
  const { records, loading, error, getRecordById, refetch } = useRecords();
  const [selectedId, setSelectedId] = useState(null);

  // Renderizado tipo SPA: en lugar de navegar a una ruta nueva, esta misma
  // página intercambia entre el listado y el expediente del paciente
  // seleccionado, tomando siempre la info de ese paciente puntual.
  if (selectedId) {
    return (
      <RecordDetailPage
        record={getRecordById(selectedId)}
        onBack={() => setSelectedId(null)}
        // getRecordById deriva del arreglo "patients" de useRecords, así que refrescarlo aquí
        // (no solo usePatientRecordDetail, que trae consultas/citas/incapacidades aparte) es lo
        // que hace que datos del propio documento del paciente (nombre, tipo de sangre,
        // antecedentes, signos vitales, procedimientos) se reflejen tras guardar un modal.
        onPatientUpdated={refetch}
      />
    );
  }

  return (
    <div className="px-10 py-8 text-slate-800">
      <h1 className="mb-8 text-3xl font-normal text-slate-400">
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
