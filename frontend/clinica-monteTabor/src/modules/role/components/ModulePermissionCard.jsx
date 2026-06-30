import { Check } from "lucide-react";
import { PERMISSION_TYPES } from "../rolesConfig.js";

const PermissionCheckbox = ({ checked, disabled, onClick, accentClass, label }) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 group/check disabled:cursor-not-allowed"
      title={disabled ? "Se activa automáticamente" : undefined}
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
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      <span
        className={`text-xs transition-colors ${
          checked ? "text-gray-700 font-medium" : "text-gray-400"
        }`}
      >
        {label}
      </span>
    </button>
  );
};

const ModulePermissionCard = ({
  moduleLabel,
  moduleIcon: ModuleIcon,
  permissions,
  onChange,
  accentSolidClass,
  readOnly,
}) => {
  // Cuando se activa create/update/delete, view se fuerza a true.
  // Cuando se desactiva view, se desactivan los demás (no tiene sentido mantenerlos sin ver).
  const handleToggle = (permKey) => {
    if (readOnly) return;

    const nextValue = !permissions[permKey];
    const updated = { ...permissions, [permKey]: nextValue };

    if (permKey === "view" && !nextValue) {
      updated.create = false;
      updated.update = false;
      updated.delete = false;
    }

    if (permKey !== "view" && nextValue) {
      updated.view = true;
    }

    onChange(updated);
  };

  const anyActive = PERMISSION_TYPES.some((p) => permissions[p.key]);

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition-colors ${
        anyActive ? "border-gray-200" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            anyActive ? accentSolidClass : "bg-gray-100"
          }`}
        >
          <ModuleIcon
            className={`w-4 h-4 ${anyActive ? "text-white" : "text-gray-400"}`}
            strokeWidth={2.2}
          />
        </div>
        <h4 className="font-bold text-sm text-gray-900">{moduleLabel}</h4>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-4 pl-1">
        {PERMISSION_TYPES.map((perm) => (
          <PermissionCheckbox
            key={perm.key}
            label={perm.label}
            checked={!!permissions[perm.key]}
            disabled={readOnly || (perm.key !== "view" && permissions[perm.key] && false)}
            onClick={() => handleToggle(perm.key)}
            accentClass={accentSolidClass}
          />
        ))}
      </div>
    </div>
  );
};

export default ModulePermissionCard;