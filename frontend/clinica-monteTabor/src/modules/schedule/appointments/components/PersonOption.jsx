/*
 * Contenido de una opción de doctor o enfermera en los selectores de citas,
 * con el mismo estilo que los diagnósticos CIE-10 de Consultas: el nombre en
 * texto normal y el identificador (licencia o DUI) en azul con letra
 * monoespaciada. El doctor espejo del admin muestra su cargo en una etiqueta
 * violeta en lugar de un identificador. Recibe { name, tag, is_admin } y un
 * detail opcional (por ejemplo la especialidad) que se muestra en gris.
 */
const PersonOption = ({ name, tag, is_admin, detail }) => (
    <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-slate-700">{name}</span>
        {tag && (
            <span
                className={
                    is_admin
                        ? "shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-600"
                        : "shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#0b66d6]"
                }
            >
                {tag}
            </span>
        )}
        {detail && <span className="truncate text-xs text-slate-400">{detail}</span>}
    </span>
);

export default PersonOption;
