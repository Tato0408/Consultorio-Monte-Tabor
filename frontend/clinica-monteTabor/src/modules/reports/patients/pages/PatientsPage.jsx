import { useState } from "react";
import ReportHeader from "../../components/ReportHeader";
import TopCard from "../../components/TopCard";
import ReportSection from "../../components/ReportsSection";
import usePacientesReport from "../hooks/usePatientsReports";
import { exportReportPdf } from "../../exportReportPdf";
import { showError } from "../../../../lib/alerts";

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 h-[220px] animate-pulse">
    <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
    <div className="h-6 w-1/3 bg-slate-100 rounded mb-2" />
    <div className="h-2 w-2/3 bg-slate-100 rounded mb-6" />
    <div className="h-[100px] bg-slate-50 rounded-lg" />
  </div>
);

const SkeletonSection = () => (
  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white animate-pulse">
    <div className="px-6 py-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100" />
      <div className="h-3 w-1/4 bg-slate-100 rounded" />
    </div>
  </div>
);

const PacientesPage = () => {
  const {
    loading, topCards, sections, pdfData,
    dateFrom, dateTo, isGeneral,
    setDateFrom, setDateTo, toggleGeneral,
  } = usePacientesReport();

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!pdfData) return;
    setExporting(true);
    try {
      await exportReportPdf(pdfData);
    } catch (error) {
      console.error(error);
      showError("No se pudo generar el PDF del reporte.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50/50 min-h-screen">
      <ReportHeader
        title="Reportes"
        subtitle="Consulta y analiza el rendimiento de la clínica"
        breadcrumb="Pacientes"
        dateFrom={dateFrom}
        dateTo={dateTo}
        isGeneral={isGeneral}
        onChangeFrom={setDateFrom}
        onChangeTo={setDateTo}
        onToggleGeneral={toggleGeneral}
        onExport={handleExport}
        exporting={exporting}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : topCards.map((card) => <TopCard key={card.key} card={card} />)}
      </div>

      <div className="space-y-4">
        {loading
          ? [0, 1, 2, 3, 4].map((i) => <SkeletonSection key={i} />)
          : sections.map((section, i) => (
              <ReportSection key={section.key} section={section} defaultOpen={i === 0} />
            ))}
      </div>
    </div>
  );
};

export default PacientesPage;
