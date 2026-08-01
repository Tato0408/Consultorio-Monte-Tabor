import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, UserRound, Activity, HeartPulse, ChevronRight, Loader2 } from "lucide-react";
import * as Icons from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { confirmResetPermissions } from "@/lib/alerts";
import RoleCard from "../components/RoleCard";
import PermissionSection from "../components/PermissionSection";
import PermissionsHeader from "../components/PermissionsHeader";
import { SIDEBAR_MODULES, ROLE_COLOR_TOKENS, ROLE_COLOR_BY_KEY, DEFAULT_ROLE_PERMISSIONS } from "../rolesConfig.js";

// Iconos de respaldo si el campo "icon" del rol (guardado en la base de datos) no coincide con ningún ícono de lucide-react
const ROLE_ICON_FALLBACK = {
  admin: ShieldCheck,
  doctor: UserRound,
  nurse: Activity,
  receptionist: HeartPulse,
};

const EMPTY_PERMISSION = { view: false, create: false, update: false, delete: false };

// Convierte el array de permisos de la API (uno por moduleKey) en un objeto indexado por moduleKey
const toPermissionMap = (permissions = []) => {
  const map = {};
  permissions.forEach((p) => {
    map[p.moduleKey] = { view: p.view, create: p.create, update: p.update, delete: p.delete };
  });
  return map;
};

const getRoleIcon = (roleKey, iconName) => Icons[iconName] || ROLE_ICON_FALLBACK[roleKey] || ShieldCheck;

const RolesPage = () => {
  const [roles, setRoles] = useState([]); // roles crudos devueltos por la API
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);
  const [mobileView, setMobileView] = useState("list"); // "list" | "permissions"
  const [pendingChanges, setPendingChanges] = useState({}); // { [moduleKey]: { [accion]: nuevoValor } }, solo del rol seleccionado

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient("/roles");
      setRoles(data);
      setSelectedRoleKey((prev) => prev ?? data[0]?.roleKey ?? null);
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar los roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const selectedRoleRaw = roles.find((r) => r.roleKey === selectedRoleKey);
  const basePermissions = selectedRoleRaw ? toPermissionMap(selectedRoleRaw.permissions) : {};

  // combina lo guardado con los cambios pendientes en memoria, para reflejar el toggle al instante sin esperar al guardado
  const effectivePermissions = { ...basePermissions };
  Object.entries(pendingChanges).forEach(([moduleKey, actions]) => {
    effectivePermissions[moduleKey] = { ...(effectivePermissions[moduleKey] || EMPTY_PERMISSION), ...actions };
  });

  const selectedRole = selectedRoleRaw && {
    key: selectedRoleRaw.roleKey,
    label: selectedRoleRaw.displayName,
    description: selectedRoleRaw.description,
    color: ROLE_COLOR_BY_KEY[selectedRoleRaw.roleKey] || "blue",
    locked: selectedRoleRaw.isProtected,
    permissions: effectivePermissions,
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // calcula, para el módulo togueado, solo los campos que cambiaron respecto a lo guardado en la base de datos
  const handleModuleChange = (moduleKey, updatedPermissions) => {
    if (!selectedRoleRaw || selectedRoleRaw.isProtected) return;
    const saved = basePermissions[moduleKey] || EMPTY_PERMISSION;
    const diff = {};
    Object.keys(updatedPermissions).forEach((action) => {
      if (updatedPermissions[action] !== saved[action]) {
        diff[action] = updatedPermissions[action];
      }
    });

    setPendingChanges((prev) => {
      const next = { ...prev };
      if (Object.keys(diff).length === 0) {
        delete next[moduleKey];
      } else {
        next[moduleKey] = diff;
      }
      return next;
    });
  };

  const handleSelectRole = (key) => {
    setSelectedRoleKey(key);
    setPendingChanges({});
    setMobileView("permissions");
  };

  const handleDiscardChanges = () => setPendingChanges({});

  // agrupa todos los toggles pendientes en un solo PATCH (un batchId por guardado)
  const handleSaveChanges = async () => {
    if (isSaving) return;
    if (!selectedRoleRaw || !hasPendingChanges) return;
    const changes = Object.entries(pendingChanges).flatMap(([moduleKey, actions]) =>
      Object.entries(actions).map(([action, value]) => ({ moduleKey, action, value }))
    );

    setIsSaving(true);
    try {
      const updatedRole = await apiClient(`/roles/${selectedRoleRaw.roleKey}`, {
        method: "PATCH",
        body: { changes },
      });
      setRoles((prev) => prev.map((r) => (r.roleKey === updatedRole.roleKey ? updatedRole : r)));
      setPendingChanges({});
      toast.success("Permisos actualizados.");
    } catch (error) {
      toast.error(error.message || "No se pudieron guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  // Restablece un rol completo a los valores predeterminados (botón en la card del rol).
  // Compara contra lo guardado en la API y envía solo lo que realmente cambia, en un solo PATCH.
  const handleResetToDefaults = async (roleKey) => {
    if (isSaving) return;
    const role = roles.find((r) => r.roleKey === roleKey);
    const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey];
    if (!role || role.isProtected || !defaults) return;

    const confirmed = await confirmResetPermissions(role.displayName);
    if (!confirmed) return;

    const currentMap = toPermissionMap(role.permissions);
    const changes = [];
    Object.entries(defaults).forEach(([moduleKey, actions]) => {
      const current = currentMap[moduleKey] || EMPTY_PERMISSION;
      Object.entries(actions).forEach(([action, value]) => {
        if (current[action] !== value) {
          changes.push({ moduleKey, action, value });
        }
      });
    });

    if (changes.length === 0) {
      toast.success("Ese rol ya tiene los valores predeterminados.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedRole = await apiClient(`/roles/${roleKey}`, {
        method: "PATCH",
        body: { changes },
      });
      setRoles((prev) => prev.map((r) => (r.roleKey === updatedRole.roleKey ? updatedRole : r)));
      // Si el rol reseteado es el que se está viendo, descarta cualquier cambio local sin guardar.
      if (selectedRoleKey === roleKey) setPendingChanges({});
      toast.success(`Permisos de ${role.displayName} restablecidos.`);
    } catch (error) {
      toast.error(error.message || "No se pudieron restablecer los permisos.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!selectedRole) {
    return <div className="p-6 text-sm text-gray-500">No se encontraron roles configurados.</div>;
  }

  const SaveBar = () =>
    !selectedRole.locked && hasPendingChanges ? (
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleDiscardChanges}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#3B6FCA] hover:bg-[#2d5ab5] disabled:opacity-60 flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    ) : null;

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
            {/* fieldset con display:contents — evita cambiar de rol o resetear permisos
                mientras hay un guardado en curso, sin alterar el layout */}
            <fieldset disabled={isSaving} className="contents">
            <div className="space-y-3">
              {roles.map((role) => {
                const Icon = getRoleIcon(role.roleKey, role.icon);
                return (
                  <RoleCard
                    key={role.roleKey}
                    role={{
                      key: role.roleKey,
                      label: role.displayName,
                      description: role.description,
                      color: ROLE_COLOR_BY_KEY[role.roleKey] || "blue",
                      locked: role.isProtected,
                      iconNode: <Icon className="w-5 h-5" strokeWidth={2.2} />,
                    }}
                    isSelected={selectedRoleKey === role.roleKey}
                    onSelect={handleSelectRole}
                    onResetDefaults={handleResetToDefaults}
                  />
                );
              })}
            </div>
            </fieldset>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    readOnly={selectedRole.locked || isSaving}
                    defaultOpen={false}
                  />
                ))}
              </div>
              <SaveBar />
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP: dos columnas */}
      <div className="hidden lg:grid lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-4 px-1">Roles</h3>
          {/* fieldset con display:contents — evita cambiar de rol o resetear permisos
              mientras hay un guardado en curso, sin alterar el layout */}
          <fieldset disabled={isSaving} className="contents">
          <div className="space-y-3">
            {roles.map((role) => {
              const Icon = getRoleIcon(role.roleKey, role.icon);
              return (
                <RoleCard
                  key={role.roleKey}
                  role={{
                    key: role.roleKey,
                    label: role.displayName,
                    description: role.description,
                    color: ROLE_COLOR_BY_KEY[role.roleKey] || "blue",
                    locked: role.isProtected,
                    iconNode: <Icon className="w-5 h-5" strokeWidth={2.2} />,
                  }}
                  isSelected={selectedRoleKey === role.roleKey}
                  onSelect={handleSelectRole}
                  onResetDefaults={handleResetToDefaults}
                />
              );
            })}
          </div>
          </fieldset>
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
                readOnly={selectedRole.locked || isSaving}
                defaultOpen={section.section === "Calendario"}
              />
            ))}
          </div>
          <SaveBar />
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
