import { useNavigate } from "react-router-dom";

const UpcomingControls = ({ controls, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Próximos controles</h3>
        <button
          type="button"
          onClick={() => navigate("/calendar/appointments")}
          className="text-xs text-blue-600 font-semibold hover:underline"
        >
          Ver calendario
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}
        </div>
      ) : controls.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sin controles próximos</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-50">
          {controls.map((c, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                <span className="text-sm font-bold leading-none">{c.day}</span>
                <span className="text-[10px] font-semibold uppercase leading-none mt-0.5">{c.month}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 truncate">{c.detail} · {c.doctor}</p>
              </div>
              <span className="text-xs font-semibold text-slate-500 flex-shrink-0">{c.time}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/calendar/appointments")}
        className="flex items-center justify-center gap-1 text-xs text-blue-600 font-semibold hover:underline mt-auto"
      >
        Ver todos los controles
      </button>
    </div>
  );
};

export default UpcomingControls;
