import { useState } from "react";
import { ShieldCheck, UserRound, Activity, HeartPulse, ChevronRight } from "lucide-react";
import RoleCard from "../components/RoleCard";
import PermissionSection from "../components/PermissionSection";
import PermissionsHeader from "../components/PermissionsHeader";
import { ROLES, SIDEBAR_MODULES, ROLE_COLOR_TOKENS } from "../rolesConfig.js";

const ROLE_ICONS = {
  admin: ShieldCheck,
  doctor: UserRound,
  nurse: Activity,
  receptionist: HeartPulse,
};

const RolesPage = () => {
  const [rolesState, setRolesState] = useState(() => {
    const initial = {};
    ROLES.forEach((role) => { initial[role.key] = role.permissions; });
    return initial;
  });

  const [selectedRoleKey, setSelectedRoleKey] = useState(ROLES[0].key);
  const [mobileView, setMobileView] = useState("list"); // "list" | "permissions"

  const selectedRoleDef = ROLES.find((r) => r.key === selectedRoleKey);
  const selectedRole = { ...selectedRoleDef, permissions: rolesState[selectedRoleKey] };

  const handleModuleChange = (moduleKey, updatedPermissions) => {
    if (selectedRoleDef.locked) return;
    setRolesState((prev) => ({
      ...prev,
      [selectedRoleKey]: { ...prev[selectedRoleKey], [moduleKey]: updatedPermissions },
    }));
  };

  const handleSelectRole = (key) => {
    setSelectedRoleKey(key);
    setMobileView("permissions");
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-gray-50/50 min-h-screen">

      {/* Header */}
      <div className="border-b border-gray-100 pb-4 md:pb-5">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
          <span>Sistema</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-700 font-medium">Roles y permisos</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Control de roles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define qué puede ver, crear, editar y eliminar cada rol del sistema.
        </p>
      </div>

      {/* MÓVIL / TABLET: navegación tipo stack */}
      <div className="lg:hidden">
        {mobileView === "list" ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-4 px-1">Roles</h3>
            <div className="space-y-3">
              {ROLES.map((role) => {
                const Icon = ROLE_ICONS[role.key];
                return (
                  <RoleCard
                    key={role.key}
                    role={{ ...role, iconNode: <Icon className="w-5 h-5" strokeWidth={2.2} /> }}
                    isSelected={selectedRoleKey === role.key}
                    onSelect={handleSelectRole}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Volver a roles
            </button>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <PermissionsHeader role={selectedRole} />
              <div className="space-y-3">
                {SIDEBAR_MODULES.map((section) => (
                  <PermissionSection
                    key={section.section}
                    section={section}
                    permissionsState={selectedRole.permissions}
                    onModuleChange={handleModuleChange}
                    accentSolidClass={ROLE_COLOR_TOKENS[selectedRole.color].solidBg}
                    readOnly={selectedRoleDef.locked}
                    defaultOpen={false}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP: dos columnas */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-4 px-1">Roles</h3>
          <div className="space-y-3">
            {ROLES.map((role) => {
              const Icon = ROLE_ICONS[role.key];
              return (
                <RoleCard
                  key={role.key}
                  role={{ ...role, iconNode: <Icon className="w-5 h-5" strokeWidth={2.2} /> }}
                  isSelected={selectedRoleKey === role.key}
                  onSelect={setSelectedRoleKey}
                />
              );
            })}
          </div>
        </div>

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