import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ModulePermissionCard from "./ModulePermissionCard";

const PermissionSection = ({
  section,
  permissionsState,
  onModuleChange,
  accentSolidClass,
  readOnly,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const SectionIcon = section.icon;

  // Cuenta cuántos módulos de esta sección tienen al menos un permiso activo,
  // para dar una referencia rápida sin tener que abrir el acordeón.
  const activeCount = section.modules.filter((m) =>
    Object.values(permissionsState[m.key] || {}).some(Boolean)
  ).length;

  return (
    <div className="bg-gray-50/60 border border-gray-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-100/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <SectionIcon className="w-4 h-4 text-gray-400" strokeWidth={2.2} />
          <span className="font-bold text-sm text-gray-800">{section.section}</span>
          <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
            {activeCount}/{section.modules.length}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {section.modules.map((module) => (
            <ModulePermissionCard
              key={module.key}
              moduleLabel={module.label}
              moduleIcon={module.icon}
              permissions={
                permissionsState[module.key] || {
                  view: false,
                  create: false,
                  update: false,
                  delete: false,
                }
              }
              onChange={(updated) => onModuleChange(module.key, updated)}
              accentSolidClass={accentSolidClass}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PermissionSection;