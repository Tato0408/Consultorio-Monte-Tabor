import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ModulePermissionCard from "./ModulePermissionCard";
import { VIEW_ONLY_MODULE_KEYS, HIDDEN_PERMISSION_ACTIONS, LOCKED_TRUE_PERMISSIONS, MODULE_VIEW_DEPENDENCIES } from "../rolesConfig.js";

const PermissionSection = ({
  section,
  permissionsState,
  onModuleChange,
  accentSolidClass,
  readOnly,
  defaultOpen = true,
  roleKey,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const SectionIcon = section.icon;

  const activeCount = section.modules.filter((m) =>
    Object.values(permissionsState[m.key] || {}).some(Boolean)
  ).length;

  return (
    <div className="bg-gray-50/60 border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 md:py-4 hover:bg-gray-100/60 transition-colors duration-200"
      >
        <div className="flex items-center gap-2 md:gap-2.5">
          <SectionIcon className="w-4 h-4 text-gray-400" strokeWidth={2.2} />
          <span className="font-bold text-sm text-gray-800">{section.section}</span>
          <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
            {activeCount}/{section.modules.length}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Animación suave con grid-template-rows */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`px-4 md:px-5 pb-4 md:pb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 transition-opacity duration-200 ease-out ${
              isOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            {section.modules.map((module) => (
              <ModulePermissionCard
                key={module.key}
                moduleLabel={module.label}
                moduleIcon={module.icon}
                permissions={
                  permissionsState[module.key] || {
                    view: false, create: false, update: false, delete: false,
                  }
                }
                onChange={(updated) => onModuleChange(module.key, updated)}
                accentSolidClass={accentSolidClass}
                readOnly={readOnly}
                viewOnly={VIEW_ONLY_MODULE_KEYS.includes(module.key)}
                hiddenActions={HIDDEN_PERMISSION_ACTIONS[module.key] || []}
                lockedActions={LOCKED_TRUE_PERMISSIONS[roleKey]?.[module.key] || []}
                // Dependencias de otros módulos a las que a este le
                // falte el permiso de Ver. Se recalcula en cada render
                // con el estado más reciente, incluidos los cambios
                // aún sin guardar, así que el aviso aparece o
                // desaparece al instante al togglear cualquiera de
                // los dos.
                missingDependencies={(MODULE_VIEW_DEPENDENCIES[module.key] || []).filter(
                  (dep) => !permissionsState[dep.moduleKey]?.view
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionSection;