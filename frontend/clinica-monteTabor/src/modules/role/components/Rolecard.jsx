import { ChevronRight, Lock } from "lucide-react";
import { ROLE_COLOR_TOKENS } from "../rolesConfig";

const RoleCard = ({ role, isSelected, onSelect }) => {
  const tokens = ROLE_COLOR_TOKENS[role.color];
  const Icon = role.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(role.key)}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 flex items-center gap-4 group
        ${isSelected
          ? `${tokens.selectedBg} ${tokens.selectedBorder} shadow-sm`
          : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/60"
        }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tokens.bg} ${tokens.text}`}
      >
        {role.iconNode}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-gray-900 truncate">
            {role.label}
          </span>
          {role.locked && (
            <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" strokeWidth={2.5} />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {role.description}
        </p>
      </div>

      <ChevronRight
        className={`w-4 h-4 flex-shrink-0 transition-colors ${
          isSelected ? tokens.text : "text-gray-300 group-hover:text-gray-400"
        }`}
      />
    </button>
  );
};

export default RoleCard;