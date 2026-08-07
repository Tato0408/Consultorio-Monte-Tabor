import { Check, Lock } from "lucide-react";
import { PERMISSION_TYPES } from "../rolesConfig.js";

const PermissionCheckbox = ({ checked, disabled, locked, onClick, accentClass, label }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex items-center gap-2 group/check disabled:cursor-not-allowed text-left"
    title={
      locked
        ? "Necesario para que el dashboard de este rol funcione — no se puede desactivar"
        : disabled
        ? "Se activa automáticamente"
        : undefined
    }
  >
    <span
      className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0
        ${checked
          ? `${accentClass} border-transparent`
          : "border-gray-300 bg-white group-hover/check:border-gray-400"
        }
        ${disabled && checked ? "opacity-70" : ""}
      `}
    >
      {locked
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
  // true para módulos cuyo backend solo expone una ruta GET (ver VIEW_ONLY_MODULE_KEYS en
  // rolesConfig.js) — Crear/Editar/Eliminar no tienen ningún endpoint real detrás, así que
  // ni siquiera se muestran esos checkboxes en vez de dejarlos togglear sin efecto.
  viewOnly = false,
  // Acciones (ej. ["view","create"]) que para este rol+módulo el dashboard necesita en true
  // siempre — ver LOCKED_TRUE_PERMISSIONS en rolesConfig.js. El backend impone lo mismo.
  lockedActions = [],
}) => {
  const handleToggle = (permKey) => {
    if (readOnly) return;
    // Bloquea solo el apagado (ya está en true por invariante del backend); no bloquea si por
    // algún motivo estuviera en false, para no dejar el permiso atascado.
    if (lockedActions.includes(permKey) && permissions[permKey]) return;
    const nextValue = !permissions[permKey];
    const updated = { ...permissions, [permKey]: nextValue };
    if (permKey === "view" && !nextValue) {
      updated.create = false; updated.update = false; updated.delete = false;
    }
    if (permKey !== "view" && nextValue) updated.view = true;
    onChange(updated);
  };

  const visiblePermissionTypes = viewOnly
    ? PERMISSION_TYPES.filter((p) => p.key === "view")
    : PERMISSION_TYPES;

  const anyActive = PERMISSION_TYPES.some((p) => permissions[p.key]);

  return (
    <div className={`bg-white border rounded-2xl p-4 md:p-5 transition-colors ${anyActive ? "border-gray-200" : "border-gray-100"}`}>
      <div className="flex items-center gap-2.5 md:gap-3 mb-3 md:mb-4">
        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${anyActive ? accentSolidClass : "bg-gray-100"}`}>
          <ModuleIcon className={`w-4 h-4 ${anyActive ? "text-white" : "text-gray-400"}`} strokeWidth={2.2} />
        </div>
        <h4 className="font-bold text-sm text-gray-900 leading-snug">{moduleLabel}</h4>
      </div>

      {/* En móvil los 4 checks caben en 2 columnas; en pantallas muy pequeñas en 1 columna */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-y-2.5 md:gap-y-3 gap-x-3 md:gap-x-4 pl-1">
        {visiblePermissionTypes.map((perm) => {
          const isLocked = lockedActions.includes(perm.key) && permissions[perm.key];
          return (
            <PermissionCheckbox
              key={perm.key}
              label={perm.label}
              checked={!!permissions[perm.key]}
              disabled={readOnly || isLocked}
              locked={isLocked}
              onClick={() => handleToggle(perm.key)}
              accentClass={isLocked ? "bg-gray-400" : accentSolidClass}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ModulePermissionCard;