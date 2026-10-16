import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";
import { User, Users, UserCheck, ChevronRight } from "lucide-react";

// Tarjeta con gráfico de dona que compara dos categorías de un tipo de
// usuario (por ejemplo activos e inactivos) contra el total. Recibe el
// total, los valores de cada categoría y los datos para armar el
// gráfico, la leyenda y el botón de navegación.
const DonutCard = ({
    icon, iconBg, title,
    total, first, firstLabel, firstColor, lightColor,
    second, secondLabel,
    route, btnLabel, gradId,
}) => {
    const navigate = useNavigate();
    // Normaliza los valores recibidos a números válidos y calcula el
    // porcentaje de cada categoría sobre el total.
    const safe  = (n) => (isNaN(n) || n == null ? 0 : n);
    const tot   = safe(total);
    const f     = safe(first);
    const s     = safe(second);
    const pct0  = tot > 0 ? Math.round((f / tot) * 100) : 0;
    const pct1  = tot > 0 ? Math.round((s / tot) * 100) : 0;
    // Si una categoría llega en cero, se usa un valor mínimo para que el
    // gráfico siempre dibuje ambos segmentos.
    const data  = [{ value: f || 0.001 }, { value: s || 0.001 }];

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

            {/* Encabezado: si la tarjeta es angosta, el total baja a una segunda
                línea en vez de montarse sobre el título. */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            {icon}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 truncate">{title}</p>
                    </div>
                    <div className="text-right ml-auto">
                        <p className="text-xl font-bold text-slate-800 leading-none">{tot.toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-0.5">registrados</p>
                    </div>
                </div>
            </div>

            <div className="px-5 pb-5 pt-1 flex flex-col gap-4">

                {/* Donut con degradado */}
                <div className="flex justify-center">
                    <div className="w-36 h-36">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%"   stopColor={lightColor}  stopOpacity={1} />
                                        <stop offset="100%" stopColor={firstColor}  stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={60}
                                    paddingAngle={3}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                    isAnimationActive={false}
                                    strokeWidth={0}
                                >
                                    <Cell fill={`url(#${gradId})`} />
                                    <Cell fill="#e2e8f0" />
                                    <Label
                                        content={({ viewBox }) => {
                                            const { cx, cy } = viewBox;
                                            return (
                                                <g>
                                                    <text x={cx} y={cy - 7} textAnchor="middle" fill="#1e293b" fontSize="20" fontWeight="700" fontFamily="inherit">
                                                        {tot.toLocaleString()}
                                                    </text>
                                                    <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="inherit">
                                                        total
                                                    </text>
                                                </g>
                                            );
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Leyenda: dos mini-tarjetas */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-slate-50">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: firstColor }} />
                        <p className="text-xs text-slate-500 font-medium text-center break-words">{firstLabel}</p>
                        <p className="text-base font-bold text-slate-800 leading-none">{f.toLocaleString()}</p>
                        <p className="text-xs font-semibold" style={{ color: firstColor }}>{pct0}%</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl bg-slate-50">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <p className="text-xs text-slate-500 font-medium text-center break-words">{secondLabel}</p>
                        <p className="text-base font-bold text-slate-800 leading-none">{s.toLocaleString()}</p>
                        <p className="text-xs font-semibold text-slate-400">{pct1}%</p>
                    </div>
                </div>

                {/* Botón */}
                <button
                    onClick={() => navigate(route)}
                    className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                    <span className="truncate">{btnLabel}</span>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                </button>
            </div>
        </div>
    );
};

// Sección con tres tarjetas de gestión de usuarios (pacientes, doctores
// y recepcionistas), cada una con su gráfico de dona y acceso directo
// al listado correspondiente.
const UserManagementSection = ({ data }) => {
    const patients      = data?.patients      || { total: 0, active: 0, inactive: 0 };
    const doctors       = data?.doctors       || { total: 0, active: 0, pending: 0 };
    const receptionists = data?.receptionists || { total: 0, active: 0, inactive: 0 };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-slate-800">Gestión de usuarios</h2>
            </div>

            {/* Columnas según el ancho real de la sección (container query):
                una en celular, dos cuando caben (la tercera ocupa la fila
                completa) y tres cuando cada tarjeta tiene espacio suficiente. */}
            <div className="@container">
            <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-4 @lg:[&>*:last-child]:col-span-2 @2xl:[&>*:last-child]:col-span-1">
                <DonutCard
                    icon={<Users className="w-4 h-4 text-blue-600" />}
                    iconBg="bg-blue-100"
                    title="Pacientes"
                    total={patients.total}
                    first={patients.active}
                    firstLabel="Activos"
                    firstColor="#3b82f6"
                    lightColor="#93c5fd"
                    second={patients.inactive}
                    secondLabel="Inactivos"
                    route="/users/patients"
                    btnLabel="Gestionar pacientes"
                    gradId="dg-blue"
                />
                <DonutCard
                    icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
                    iconBg="bg-emerald-100"
                    title="Doctores"
                    total={doctors.total}
                    first={doctors.active}
                    firstLabel="Activos"
                    firstColor="#10b981"
                    lightColor="#6ee7b7"
                    second={doctors.pending}
                    secondLabel="Pendientes"
                    route="/users/doctors"
                    btnLabel="Gestionar doctores"
                    gradId="dg-emerald"
                />
                <DonutCard
                    icon={<User className="w-4 h-4 text-violet-600" />}
                    iconBg="bg-violet-100"
                    title="Recepcionistas"
                    total={receptionists.total}
                    first={receptionists.active}
                    firstLabel="Activos"
                    firstColor="#8b5cf6"
                    lightColor="#c4b5fd"
                    second={receptionists.inactive}
                    secondLabel="Inactivos"
                    route="/users/recepcionist"
                    btnLabel="Gestionar recepcionistas"
                    gradId="dg-violet"
                />
            </div>
            </div>
        </div>
    );
};

export default UserManagementSection;
