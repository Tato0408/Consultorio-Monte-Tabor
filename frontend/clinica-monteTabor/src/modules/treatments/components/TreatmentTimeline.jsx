import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { timeline_entry_meta } from "../data/treatmentsData";

// Clases de color por tono de la etiqueta de cada entrada. Van completas
// porque Tailwind solo detecta las clases que aparecen literales en el
// código, nunca interpoladas.
const tone_classes = {
  green: { dot: "bg-green-500", tag: "bg-green-50 text-green-700" },
  blue: { dot: "bg-blue-500", tag: "bg-blue-50 text-blue-700" },
  amber: { dot: "bg-amber-500", tag: "bg-amber-50 text-amber-700" },
  purple: { dot: "bg-purple-500", tag: "bg-purple-50 text-purple-700" },
  teal: { dot: "bg-teal-500", tag: "bg-teal-50 text-teal-700" },
  slate: { dot: "bg-slate-400", tag: "bg-slate-100 text-slate-600" },
  red: { dot: "bg-red-500", tag: "bg-red-50 text-red-700" },
};

// Línea de tiempo del tratamiento: una sola lista cronológica (más
// reciente primero) con evoluciones de consulta, notas, cambios de plan,
// documentos y cambios de estado. Solo las notas manuales se pueden editar
// o borrar (entry.editable).
const TreatmentTimeline = ({ entries, canUpdate, canDelete, onEditNote, onDeleteNote }) => {
  if (!entries?.length) {
    return (
      <p className="text-sm text-slate-400 text-center py-10">
        Todavía no hay movimientos en este tratamiento.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, index) => {
        const meta = timeline_entry_meta[entry.entry_type] || timeline_entry_meta.nota;
        const tone = tone_classes[meta.tone] || tone_classes.slate;
        const is_last = index === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3.5">
            <div className="flex flex-col items-center flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${tone.dot}`} />
              {!is_last && <span className="flex-1 w-px bg-slate-200 my-1" />}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone.tag}`}>
                  {meta.label}
                </span>
                {entry.from_consultation && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <ExternalLink className="w-2.5 h-2.5" />
                    desde consulta
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mt-1.5 whitespace-pre-wrap">{entry.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-slate-400">{entry.date} · {entry.author}</p>
                {entry.editable && (
                  <div className="flex items-center gap-0.5 -mr-1.5">
                    {canUpdate && (
                      <button
                        type="button"
                        title="Editar nota"
                        onClick={() => onEditNote(entry)}
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        title="Eliminar nota"
                        onClick={() => onDeleteNote(entry)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TreatmentTimeline;
