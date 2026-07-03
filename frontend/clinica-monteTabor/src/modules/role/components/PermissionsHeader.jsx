import { Lock } from "lucide-react";
import { ROLE_COLOR_TOKENS, ALL_MODULE_KEYS } from "../rolesConfig.js";

const PermissionsHeader = ({ role }) => {
  const tokens = ROLE_COLOR_TOKENS[role.color];

  const totalActive = ALL_MODULE_KEYS.reduce((count, key) => {
    const perms = role.permissions[key];
    return count + (perms?.view ? 1 : 0);
  }, 0);

  return (
    <div className="flex items-start justify-between gap-3 mb-5 md:mb-6 flex-wrap">
      <div>
        <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
          Permisos:{" "}
          <span className={tokens.text}>{role.label}</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {totalActive} de {ALL_MODULE_KEYS.length} módulos con acceso habilitado
        </p>
      </div>

      {role.locked && (
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-500 text-[11px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
          <Lock className="w-3 h-3" strokeWidth={2.5} />
          Rol protegido
        </div>
      )}
    </div>
  );
};

export default PermissionsHeader;