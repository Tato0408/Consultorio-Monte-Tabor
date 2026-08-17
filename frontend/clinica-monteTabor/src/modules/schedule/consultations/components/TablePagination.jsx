import { ChevronLeft, ChevronRight } from "lucide-react";

const ROWS_OPTIONS = [5, 8, 10, 20, 50];

const TablePagination = ({ pagination, onPageChange, onLimitChange }) => {
    const { page, totalPages, limit } = pagination;

    return (
        <div className="flex items-center justify-between mt-4 pt-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Filas por página</span>
                <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                    {ROWS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={16} /> Anterior
                </button>
                <span>{page} de {totalPages}</span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Siguiente <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default TablePagination;