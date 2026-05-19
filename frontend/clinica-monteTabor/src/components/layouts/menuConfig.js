//Roles existentes en el proyecto

//Usar export al inicio nos permite exportar multiples elementos de este archivo al contrario del default que exporta todo un componente
export const roles = {
    admin: "admin",
    doctor: "doctor",
    nurse: "nurse",
    receptionist: "recepcionist"
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
            { title: 'Horarios', path: '/calendar/schedules', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Citas', path: '/calendar/appointments', allowedRoles: [roles.admin, roles.doctor, roles.receptionist] }
        ]
    },
    {
        title: 'Usuarios',
        icon: 'Users',
        allowedRoles: [roles.admin],
        subItems: [
            { title: 'Doctores', path: '/users/doctors', allowedRoles: [roles.admin] },
            { title: 'Pacientes', path: '/users/patients', allowedRoles: [roles.admin] },
            { title: 'Recepcionista', path: '/users/receptionist', allowedRoles: [roles.admin] },
            { title: 'Enfermeras', path: '/users/nurses', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Reportes',
        icon: 'FileText',
        allowedRoles: [roles.admin, roles.doctor],
        subItems: [
            { title: 'Citas', path: '/reports/appointments', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Historial clínico', path: '/reports/clinicalHistory', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Pacientes', path: '/reports/patients', allowedRoles: [roles.admin, roles.doctor] },
            { title: 'Doctores', path: '/reports/doctors', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Procedimientos',
        icon: 'Activity',
        allowedRoles: [roles.admin, roles.doctor],
        subItems: [
            { title: 'Procedimientos', path: '/procedures', allowedRoles: [roles.admin, roles.doctor] }
        ]
    },
    {
        title: 'Inventario',
        icon: 'Package',
        allowedRoles: [roles.admin],
        subItems: [
            { title: 'Productos', path: '/inventory/products', allowedRoles: [roles.admin] },
            { title: 'Tratamientos', path: '/iventory/treatments', allowedRoles: [roles.admin] },
            { title: 'Movimientos', path: '/inventory/movements', allowedRoles: [roles.admin] },
            { title: 'Reportes de inventario', path: '/inventory/reports', allowedRoles: [roles.admin] }
        ]
    },
    {
        title: 'Sistema',
        icon: 'Settings',
        allowedRoles: [roles.admin, roles.doctor, roles.receptionist, roles.nurse],
        subItems: [
            { title: 'Roles y permisos', path: '/system/privileges', allowedRoles: [roles.admin] },
            { title: 'Mi perfil', path: '/system/profile', allowedRoles: [roles.admin, roles.doctor, roles.receptionist, roles.nurse] }
        ]
    }
];