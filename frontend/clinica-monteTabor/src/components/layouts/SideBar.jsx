import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { sideBarMenu } from './menuConfig';
import { useAuth } from '@/context/AuthContext';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Renderiza dinámicamente un icono de Lucide a partir de su nombre como string.
const IconComponent = ({ name, className, size = 18 }) => {
    const Icon = Icons[name];
    return Icon ? <Icon className={className} size={size} /> : <Icons.HelpCircle className={className} size={size} />;
};

// Controla el menú de navegación principal del sistema. Filtra las
// opciones según el rol del usuario autenticado y maneja los estados
// colapsables de cada grupo.
const SideBar = ({ onClose = () => {} }) => {
    const location = useLocation();
    const { hasPermission, userType, isLoading } = useAuth();

    // Mientras se verifica la sesión (GET /auth/me) todavía no se conoce el
    // rol real, así que se renderiza un estado de carga para no mostrar el
    // menú con un rol incorrecto o vacío en ese instante.
    if (isLoading) {
        return (
            <aside className="w-65 h-screen bg-white border-r border-slate-100 flex flex-col p-4">
                <div className="flex items-center gap-3 px-2 py-4 mb-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
            </aside>
        );
    }
 
    // Filtra los módulos principales de la barra lateral según la matriz de
    // permisos (moduleKey y view). Un grupo se muestra si al menos uno de
    // sus subItems tiene view en true.

    // 1. Filtrar los módulos principales según permisos por moduleKey.
    const filteredMenu = sideBarMenu.reduce((acc, item) => {
        // 2. Si el módulo tiene hijos (grupo sin moduleKey propio), filtrar
        // los hijos y mostrar el grupo solo si queda al menos uno visible.
        if (item.subItems) {
            const visibleSubItems = item.subItems.filter(sub =>
                hasPermission(sub.moduleKey, "view") && !sub.hiddenForRoles?.includes(userType)
            );
            if (visibleSubItems.length > 0) {
                acc.push({ ...item, subItems: visibleSubItems });
            }
        } else if (hasPermission(item.moduleKey, "view")) {
            acc.push(item);
        }
        return acc;
    }, []);

    // Acordeones que deben abrirse por defecto: aquellos cuyo path de algún
    // subItem coincide con la ruta activa (location.pathname).
    const defaultOpenValues = filteredMenu.reduce((acc, item, index) => {
        if (item.subItems?.some(sub => sub.path === location.pathname)) {
            acc.push(`item-${index}`);
        }
        return acc;
    }, []);
 
    return (
        <aside className="w-65 h-screen bg-white border-r border-slate-100 flex flex-col p-4 select-none">
 
            <div className="flex items-center gap-3 px-2 py-4 mb-2">
                <img
                    src="/logoAppSinFondo.png"
                    alt="Clínica Monte Tabor"
                    className="w-10 h-10 object-contain flex-shrink-0"
                />
                <span className="font-bold text-slate-800 text-lg tracking-wide flex-1">Monte Tabor</span>
                <button
                    onClick={onClose}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                    aria-label="Cerrar menú"
                >
                    <Icons.X className="w-4 h-4" />
                </button>
            </div>
 
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <Accordion multiple defaultValue={defaultOpenValues} className="w-full space-y-1">
                    {filteredMenu.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
 
                        // Item simple sin submenú, ej: Dashboard.
                        if (!hasSubItems) {
                            return (
                                <NavLink
                                    key={index}
                                    to={item.path}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                                        isActive
                                            ? "bg-[#0b66d6] text-white shadow-md shadow-blue-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <IconComponent name={item.icon} size={20} />
                                    <span>{item.title}</span>
                                </NavLink>
                            );
                        }
 
                        // Item con submenú colapsable.
                        // Una sección se considera "activa" si la ruta actual coincide con alguno de sus subItems.
                        const isSectionActive = item.subItems.some(sub => sub.path === location.pathname);
 
                        return (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
                                <AccordionTrigger
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                                        "after:hidden",
                                        isSectionActive
                                            ? "bg-[#0b66d6] text-white shadow-md shadow-blue-100 hover:bg-[#0b66d6] **:data-[slot=accordion-trigger-icon]:text-white"
                                            : "text-[#0b66d6]/90 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconComponent name={item.icon} size={18} className={isSectionActive ? "text-white" : "text-[#0b66d6]"} />
                                        <span>{item.title}</span>
                                    </div>
                                </AccordionTrigger>
 
                                <AccordionContent className="pt-1 pb-2 pl-2 space-y-0.5">
                                    {item.subItems.map((subItem, subIndex) => {
                                        const isSubActive = location.pathname === subItem.path;
                                        return (
                                            <NavLink
                                                key={subIndex}
                                                to={subItem.path}
                                                className={({ isActive }) => cn(
                                                    "flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                                                    isActive
                                                        ? "text-[#0b66d6] bg-blue-50/60 font-semibold"
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                )}
                                            >
                                                <IconComponent name={subItem.icon} size={16} className={isSubActive ? "text-[#0b66d6]" : "text-slate-400"} />
                                                <span>{subItem.title}</span>
                                            </NavLink>
                                        );
                                    })}
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>
 
        </aside>
    );
}
export default SideBar