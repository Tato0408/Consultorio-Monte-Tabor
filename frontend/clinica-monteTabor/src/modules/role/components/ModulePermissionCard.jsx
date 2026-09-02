import { Check, Lock, TriangleAlert } from "lucide-react";
import { PERMISSION_TYPES } from "../rolesConfig.js";

const PermissionCheckbox = ({ checked, disabled, locked, blocked, onClick, accentClass, label }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex items-center gap-2 group/check disabled:cursor-not-allowed text-left"
    title={
      locked
        ? "Necesario para que el dashboard de este rol funcione — no se puede desactivar"
        : blocked
        ? "No disponible para este rol — no se puede activar"
        : disabled
        ? "Se activa automáticamente"
        : undefined
    }
  >
    <span
      className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0
        ${checked
          ? `${accentClass} border-transparent`
          : blocked
          ? "bg-gray-400 border-gray-400"
          : "border-gray-300 bg-white group-hover/check:border-gray-400"
        }
        ${disabled && checked ? "opacity-70" : ""}
      `}
    >
      {/* Obligatorio en true (locked): se ve igual que una casilla del admin
          —fondo del color del rol y check blanco— pero no se puede tocar.
          Obligatorio en false (blocked): candado blanco sobre fondo gris. */}
      {locked
        ? <Check className="w-3 h-3 text-white" strokeWidth={3} />
        : blocked
        ? <Lock className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        : checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
    <span className={`text-xs transition-colors ${checked ? "text-gray-700 font-medium" : "text-gray-400"}`}>
      {label}
    </span>
  </button>
);

const ModulePermissionCard = ({
  moduleLabel,
  moduleIcon: ModuleIcon,
  permissions,
  onChange,
  accentSolidClass,
  readOnly,
  // true para módulos cuyo backend solo expone una ruta GET (ver
  // VIEW_ONLY_MODULE_KEYS en rolesConfig.js). Crear, editar y eliminar
  // no tienen ningún endpoint real detrás, así que ni siquiera se
  // muestran esos checkboxes, en vez de dejarlos togglear sin efecto.
  viewOnly = false,
  // Acciones puntuales (por ejemplo [create, delete]) sin ningún
  // endpoint real detrás para este módulo, ver
  // HIDDEN_PERMISSION_ACTIONS en rolesConfig.js. A diferencia de
  // viewOnly, oculta solo esas acciones puntuales, no todo menos Ver.
  hiddenActions = [],
  // Acciones (por ejemplo [view, create]) que para este rol y este
  // módulo el dashboard necesita siempre en true, ver
  // LOCKED_TRUE_PERMISSIONS en rolesConfig.js. El backend impone lo
  // mismo.
  lockedActions = [],
  // Acciones que para este rol y este módulo NUNCA pueden activarse, ver
  // LOCKED_FALSE_PERMISSIONS en rolesConfig.js. El backend impone lo mismo.
  blockedActions = [],
  // Módulos (con su label legible) cuyo permiso de Ver le falta a
  // este rol y que este módulo necesita para funcionar sin errores,
  // ver MODULE_VIEW_DEPENDENCIES en rolesConfig.js.
  missingDependencies = [],
}) => {
  const handleToggle = (permKey) => {
    if (readOnly) return;
    // Bloquea solo el apagado, ya que está en true por invariante del
    // backend. No bloquea si por algún motivo estuviera en false, para
    // no dejar el permiso atascado.
    if (lockedActions.includes(permKey) && permissions[permKey]) return;
    // Bloquea solo el encendido. Es lo opuesto a lockedActions: esta
    // acción nunca puede quedar en true para este rol y este módulo.
    if (blockedActions.includes(permKey) && !permissions[permKey]) return;
    const nextValue = !permissions[permKey];
    const updated = { ...permissions, [permKey]: nextValue };
    if (permKey === "view" && !nextValue) {
      updated.create = false; updated.update = false; updated.delete = false;
    }
    if (permKey !== "view" && nextValue) updated.view = true;
    onChange(updated);
  };

  const visiblePermissionTypes = (viewOnly
    ? PERMISSION_TYPES.filter((p) => p.key === "view")
    : PERMISSION_TYPES
  ).filter((p) => !hiddenActions.includes(p.key));

  const anyActive = PERMISSION_TYPES.some((p) => permissions[p.key]);

  return (
    <div className={`bg-white border rounded-2xl p-4 md:p-5 transition-colors ${anyActive ? "border-gray-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${anyActive ? accentSolidClass : "bg-gray-100"}`}>
          <ModuleIcon className={`w-4 h-4 ${anyActive ? "text-white" : "text-gray-400"}`} strokeWidth={2.2} />
        </div>
        <h4 className="font-bold text-sm text-gray-900 leading-snug">{moduleLabel}</h4>
      </div>

      {/* En móvil los 4 checks caben en 2 columnas. En pantallas muy
          pequeñas caben en 1 columna. */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-y-2.5 md:gap-y-3 gap-x-3 md:gap-x-4 pl-1">
        {visiblePermissionTypes.map((perm) => {
          const isLocked = lockedActions.includes(perm.key) && permissions[perm.key];
          const isBlocked = blockedActions.includes(perm.key) && !permissions[perm.key];
          return (
            <PermissionCheckbox
              key={perm.key}
              label={perm.label}
              checked={!!permissions[perm.key]}
              disabled={readOnly || isLocked || isBlocked}
              locked={isLocked}
              blocked={isBlocked}
              onClick={() => handleToggle(perm.key)}
              // Obligatorio en true: se pinta con el color del rol y check
              // blanco, idéntico a una casilla del admin (antes iba en gris).
              accentClass={accentSolidClass}
            />
          );
        })}
      </div>

      {/* Solo se muestra si este módulo ya tiene Ver activado y le falta Ver
          en alguno de los módulos de los que depende su pantalla. Si Ver
          está apagado, todavía no aplica. */}
      {permissions.view && missingDependencies.length > 0 && (
        <div className="mt-3 md:mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <TriangleAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2.2} />
          <p className="text-[11px] leading-relaxed text-amber-700">
            Si activas la visualización de {moduleLabel}, también hay que activar &quot;Ver&quot; en:{" "}
            <span className="font-semibold">{missingDependencies.map((d) => d.label).join(", ")}</span>
            . Si no, esta pantalla va a cargar incompleta o con errores para este rol.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModulePermissionCard;