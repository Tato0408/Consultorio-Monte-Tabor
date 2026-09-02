// Roles existentes en el proyecto.
export const roles = {
    admin: "admin",
    doctor: "doctor",
    nurse: "nurse",
    receptionist: "receptionist"
};
 
// Apartados que conforman el menú lateral.
export const sideBarMenu = [
    {
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        path: '/home',
        moduleKey: 'dashboard'
    },
    {
        title: 'Calendario',
        icon: 'Calendar',
        subItems: [
            // "Horarios" es para quien puede tener un horario propio (doctor, enfermera,
            // admin). Recepción necesita calendar.schedule.view para consultar
            // disponibilidad al agendar, pero eso no debe abrirle esta pantalla de
            // autoservicio (ver RequireRole en App.jsx).
            { title: 'Horarios', icon: 'CalendarClock', path: '/calendar/schedule-config', moduleKey: 'calendar.schedule', hiddenForRoles: ['receptionist'] },
            { title: 'Citas', icon: 'CalendarCheck2', path: '/calendar/appointments', moduleKey: 'calendar.appointments' },
            { title: 'Consultas', icon: 'ClipboardList', path: '/calendar/consultations', moduleKey: 'calendar.consultations' }
        ]
    },
    {
        title: 'Usuarios',
        icon: 'Users',
        subItems: [
            { title: 'Doctores', icon: 'UserPlus', path: '/users/doctors', moduleKey: 'users.doctors' },
            { title: 'Pacientes', icon: 'UserCheck', path: '/users/patients', moduleKey: 'users.patients' },
            { title: 'Recepcionista', icon: 'User', path: '/users/recepcionist', moduleKey: 'users.receptionist' },
            { title: 'Enfermeras', icon: 'UserPlus2', path: '/users/nurses', moduleKey: 'users.nurses' }
        ]
    },
    {
        title: 'Procedimientos',
        icon: 'Activity',
        subItems: [
            { title: 'Procedimientos', icon: 'Stethoscope', path: '/procedures', moduleKey: 'procedures' },
            { title: 'Tratamientos', icon: 'FileBox', path: '/inventory/treatments', moduleKey: 'inventory.treatments' },
            // Expediente clínico vive con Procedimientos (y ya no con Reportes) porque es
            // el único de esos módulos con acciones reales de creación/edición/eliminación
            // (incapacidades, antecedentes, procedimientos del paciente), a diferencia de
            // los reportes, que son solo de consulta.
            { title: 'Expediente', icon: 'FileClock', path: '/reports/records', moduleKey: 'reports.records' }
        ]
    },
    {
        title: 'Reportes',
        icon: 'FileText',
        subItems: [
            { title: 'Citas', icon: 'CalendarCheck2', path: '/reports/appointments', moduleKey: 'reports.appointments' },
            { title: 'Pacientes', icon: 'UserRound', path: '/reports/patients', moduleKey: 'reports.patients' },
            { title: 'Doctores', icon: 'User', path: '/reports/doctors', moduleKey: 'reports.doctors' },
            // Reportes de inventario se agrupa aquí, junto al resto de reportes solo de
            // lectura, en vez de dentro de Inventario.
            { title: 'Reportes de inventario', icon: 'ClipboardCheck', path: '/inventory/reports', moduleKey: 'inventory.reports' }
        ]
    },
    {
        title: 'Inventario',
        icon: 'Package',
        subItems: [
            { title: 'Productos', icon: 'Briefcase', path: '/inventory/products', moduleKey: 'inventory.products' },
            { title: 'Movimientos', icon: 'FileSignature', path: '/inventory/movements', moduleKey: 'inventory.movements' }
        ]
    },
    {
        title: 'Sistema',
        icon: 'Settings',
        subItems: [
            { title: 'Roles y permisos', icon: 'FileSignature', path: '/system/privileges', moduleKey: 'system.roles' },
            { title: 'Mi perfil', icon: 'User', path: '/system/profile', moduleKey: 'system.profile' }
        ]
    }
];