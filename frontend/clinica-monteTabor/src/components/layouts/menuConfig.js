//Roles existentes en el proyecto

//Usar export al inicio nos permite exportar multiples elementos de este archivo al contrario del default que exporta todo un componente
export const roles = {
    admin: "admin",
    doctor: "doctor",
    nurse: "nurse",
    receptionist: "receptionist"
};
 
//Apartados que conforman el menu lateral
export const sideBarMenu = [
    {
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/home',
        allowedRoles: [roles.admin, roles.doctor, roles.receptionist, roles.nurse]
    },
    {
        title: 'Calendario',
        icon: 'Calendar',
        allowedRoles: [roles.admin, roles.doctor, roles.receptionist],
        subItems: [
            { title: 'Horarios', icon: 'CalendarClock', path: '/calendar/schedules', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Citas', icon: 'CalendarCheck2', path: '/calendar/appointments', allowedRoles: [roles.admin, roles.doctor, roles.receptionist] },
            { title: 'Consultas', icon: 'ClipboardList', path: '/calendar/consultations', allowedRoles: [roles.admin, roles.doctor, roles.receptionist] }
        ]
    },
    {
        title: 'Usuarios',
        icon: 'Users',
        allowedRoles: [roles.admin],
        subItems: [
            { title: 'Doctores', icon: 'UserPlus', path: '/users/doctors', allowedRoles: [roles.admin] },
            { title: 'Pacientes', icon: 'UserCheck', path: '/users/patients', allowedRoles: [roles.admin] },
            { title: 'Recepcionista', icon: 'User', path: '/users/receptionist', allowedRoles: [roles.admin] },
            { title: 'Enfermeras', icon: 'UserPlus2', path: '/users/nurses', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Procedimientos',
        icon: 'Activity',
        allowedRoles: [roles.admin, roles.doctor],
        subItems: [
            { title: 'Procedimientos', icon: 'Stethoscope', path: '/procedures', allowedRoles: [roles.admin, roles.doctor] }
        ]
    },
    {
        title: 'Reportes',
        icon: 'FileText',
        allowedRoles: [roles.admin, roles.doctor],
        subItems: [
            { title: 'Citas', icon: 'CalendarCheck2', path: '/reports/appointments', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Historial clínico', icon: 'FileClock', path: '/reports/clinicalHistory', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Pacientes', icon: 'UserRound', path: '/reports/patients', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Doctores', icon: 'User', path: '/reports/doctors', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Inventario',
        icon: 'Package',
        allowedRoles: [roles.admin],
        subItems: [
            { title: 'Productos', icon: 'Briefcase', path: '/inventory/products', allowedRoles: [roles.admin] },
            { title: 'Tratamientos', icon: 'FileBox', path: '/iventory/treatments', allowedRoles: [roles.admin] },
            { title: 'Movimientos', icon: 'FileSignature', path: '/inventory/movements', allowedRoles: [roles.admin] },
            { title: 'Reportes de inventario', icon: 'ClipboardCheck', path: '/inventory/reports', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Sistema',
        icon: 'Settings',
        allowedRoles: [roles.admin, roles.doctor, roles.receptionist, roles.nurse],
        subItems: [
            { title: 'Roles y permisos', icon: 'FileSignature', path: '/system/privileges', allowedRoles: [roles.admin] },
            { title: 'Mi perfil', icon: 'User', path: '/system/profile', allowedRoles: [roles.admin, roles.doctor, roles.receptionist, roles.nurse] }
        ]
    }
];