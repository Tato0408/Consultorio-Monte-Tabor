// src/components/layouts/Sidebar.jsx
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

// Helper dinámico para renderizar iconos de Lucide pasados como string
const IconComponent = ({ name, className, size = 18 }) => {
    const Icon = Icons[name];
    return Icon ? <Icon className={className} size={size} /> : <Icons.HelpCircle className={className} size={size} />;
};
 
const SideBar = () => {
    const location = useLocation();
    const { userType, isLoading } = useAuth();
 
    // Mientras se verifica la sesión (GET /auth/me) no sabemos el rol real todavía.
    // Evitamos renderizar el menú con un rol incorrecto/vacío en ese instante.
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
 
    const currentUserRole = userType;
 
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
 
    // Acordeones que deben abrirse por defecto: aquellos que contienen la ruta activa
    const defaultOpenValues = filteredMenu.reduce((acc, item, index) => {
        if (item.subItems?.some(sub => sub.path === location.pathname)) {
            acc.push(`item-${index}`);
        }
        return acc;
    }, []);
 
    return (
        <aside className="w-65 h-screen bg-white border-r border-slate-100 flex flex-col p-4 select-none">
 
            <div className="flex items-center gap-3 px-2 py-4 mb-2">
                <div className="w-10 h-10 bg-[#0b66d6] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-100"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                    T
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-wide">Monte Tabor</span>
            </div>
 
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <Accordion multiple defaultValue={defaultOpenValues} className="w-full space-y-1">
                    {filteredMenu.map((item, index) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
 
                        //Item simple sin submenú Ej: Dashboard
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
 
                        //Item con submenú colapsable
                        // Una sección se considera "activa" si la ruta actual coincide con alguno de sus subItems
                        const isSectionActive = item.subItems.some(sub => sub.path === location.pathname);
 
                        return (
                            <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
                                <AccordionTrigger
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-semibold uppercase tracking-wide transition-all",
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