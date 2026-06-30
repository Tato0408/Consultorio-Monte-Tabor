import { useState } from "react";
import { ShieldCheck, UserRound, Activity, HeartPulse, ChevronRight } from "lucide-react";
import RoleCard from "../components/RoleCard";
import PermissionSection from "../components/PermissionSection";
import PermissionsHeader from "../components/PermissionsHeader";
import { ROLES, SIDEBAR_MODULES, ROLE_COLOR_TOKENS } from "../rolesConfig.js";

// Iconos de cabecera por rol (decorativos, distintos al icono de cada módulo)
const ROLE_ICONS = {
  admin: ShieldCheck,
  doctor: UserRound,
  nurse: Activity,
  receptionist: HeartPulse,
};

const RolesPage = () => {
  // Estado local: copia editable de los roles, indexado por key de rol.
  // Por ahora solo vive en memoria del frontend, sin persistencia a backend.
  const [rolesState, setRolesState] = useState(() => {
    const initial = {};
    ROLES.forEach((role) => {
      initial[role.key] = role.permissions;
    });
    return initial;
  });

  const [selectedRoleKey, setSelectedRoleKey] = useState(ROLES[0].key);

  const selectedRoleDef = ROLES.find((r) => r.key === selectedRoleKey);
  const selectedRole = {
    ...selectedRoleDef,
    permissions: rolesState[selectedRoleKey],
  };

  const handleModuleChange = (moduleKey, updatedPermissions) => {
    if (selectedRoleDef.locked) return; // el admin no se puede tocar

    setRolesState((prev) => ({
      ...prev,
      [selectedRoleKey]: {
        ...prev[selectedRoleKey],
        [moduleKey]: updatedPermissions,
      },
    }));
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50/50 min-h-screen">
      <div className="border-b border-gray-100 pb-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Sistema</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 font-medium">Roles y permisos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Control de roles
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Define qué puede ver, crear, editar y eliminar cada rol del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        {/* COLUMNA IZQUIERDA: lista de roles */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-4 px-1">
            Roles
          </h3>
          <div className="space-y-3">
            {ROLES.map((role) => (
              <RoleCard
                key={role.key}
                role={{ ...role, iconNode: (() => {
                  const Icon = ROLE_ICONS[role.key];
                  return <Icon className="w-5 h-5" strokeWidth={2.2} />;
                })() }}
                isSelected={selectedRoleKey === role.key}
                onSelect={setSelectedRoleKey}
              />
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA: permisos del rol seleccionado */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <PermissionsHeader role={selectedRole} />

          <div className="space-y-4">
            {SIDEBAR_MODULES.map((section) => (
              <PermissionSection
                key={section.section}
                section={section}
                permissionsState={selectedRole.permissions}
                onModuleChange={handleModuleChange}
                accentSolidClass={ROLE_COLOR_TOKENS[selectedRole.color].solidBg}
                readOnly={selectedRoleDef.locked}
                defaultOpen={section.section === "Calendario"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;