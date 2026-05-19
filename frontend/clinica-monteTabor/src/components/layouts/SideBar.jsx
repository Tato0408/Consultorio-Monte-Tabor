// src/components/layouts/Sidebar.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { sideBarMenu } from './menuConfig';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const SideBar = () => {
    const location = useLocation();

    // TODO: Cambiar este string por el rol real del usuario autenticado en el futuro (Context/Zustand)
    const currentUserRole = 'admin';

    // 1. Filtrar los módulos principales según el rol
    const filteredMenu = sideBarMenu.filter(item =>
        item.allowedRoles.includes(currentUserRole)
    ).map(item => {
        // 2. Si el módulo tiene hijos, filtrar también los hijos por rol
        if (item.subItems) {
            return {
                ...item,
                subItems: item.subItems.filter(sub => sub.allowedRoles.includes(currentUserRole))
            };
        }
        return item;
    });

    // Helper dinámico para renderizar iconos de Lucide pasados como string
    const IconComponent = ({ name, className }) => {
        const Icon = Icons[name];
        return Icon ? <Icon className={className} size={20} /> : <Icons.HelpCircle className={className} size={20} />;
    };
    return (
        <aside className="w-65 h-screen bg-white border-r border-slate-100 flex flex-col p-4 select-none">

            <div className="flex items-center gap-3 px-2 py-4 mb-4">
                <div className="w-10 h-10 bg-[#0b66d6] text-white flex items-center justify-center font-bold text-xl rounded-xl shadow-md shadow-blue-100">
                    T
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-wide">Monte Tabor</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <Accordion type="multiple" className="w-full space-y-1">
                    {filteredMenu.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isDashboardActive = location.pathname === item.path;

                        //Item simple sin submenú Ej: Dashboard
                        if (!hasSubItems) {
                            return (
                                <NavLink
                                    key={index}
                                    to={item.path}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-[#0b66d6] text-white shadow-md shadow-blue-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <IconComponent name={item.icon} />
                                    <span>{item.title}</span>
                                </NavLink>
                            );
                        }

                        //Item con submenú colapsable
                        return (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
                                <AccordionTrigger
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all [&[data-state=open]>svg]:rotate-180",
                                        "after:hidden" // Remueve la línea por defecto si reescribiste estilos globales
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <IconComponent name={item.icon} className="text-slate-500" />
                                        <span>{item.title}</span>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="pt-1 pb-2 pl-9 space-y-1">
                                    {item.subItems.map((subItem, subIndex) => {
                                        const isSubActive = location.pathname === subItem.path;
                                        return (
                                            <NavLink
                                                key={subIndex}
                                                to={subItem.path}
                                                className={({ isActive }) => cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                                                    isActive
                                                        ? "text-[#0b66d6] bg-blue-50/60 font-semibold"
                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                )}
                                            >
                                                {/* Pequeño indicador visual o icono secundario si gustas, en este caso dejamos texto limpio alineado */}
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