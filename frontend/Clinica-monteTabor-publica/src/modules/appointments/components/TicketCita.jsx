import { CalendarDays, Clock, MapPin, DollarSign, Info, ShieldCheck, CheckCircle2, User } from "lucide-react";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const fmtFecha = (date) =>
  date.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Ticket con el resumen de la cita: se usa tanto para revisar antes de confirmar
// como para mostrar la cita ya confirmada. Cuando el pago es en línea solo se cobra un
// anticipo (deposit) para apartar la hora; el resto se paga en recepción. doctor y
// nurse nunca llegan definidos a la vez (nurse es la proveedora principal solo cuando
// el procedimiento no requiere doctor). requiresDoctor solo decide el texto por
// defecto cuando todavía no hay proveedor elegido (modo agregado).
const TicketCita = ({ doctor, nurse, requiresDoctor = true, tipoLabel, generalidades, date, startTime, endTime, total, instructions, pagoOnline, deposit, depositPagado }) => (
  <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
    <div className="bg-[#3B6FCA] px-6 py-4">
      <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Resumen de tu cita</p>
      <p className="text-white font-bold text-lg">{tipoLabel}</p>
    </div>

    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#3B6FCA]/10 flex items-center justify-center text-[#3B6FCA] font-bold flex-shrink-0 overflow-hidden">
          {doctor?.img_url || nurse?.img_url ? (
            <img src={doctor?.img_url || nurse?.img_url} alt="" className="w-full h-full object-cover" />
          ) : doctor?.name || nurse?.name ? (
            (doctor || nurse).name[0]
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="text-sm text-gray-400">Atendido por</p>
          <p className="font-semibold text-gray-800">
            {doctor
              ? `Dr. ${doctor.name} ${doctor.last_name}`
              : nurse
                ? `${nurse.name} ${nurse.last_name}`
                : requiresDoctor
                  ? "Por asignar (cualquier doctor disponible)"
                  : "Por asignar (cualquier enfermera disponible)"}
          </p>
        </div>
      </div>

      {generalidades && (
        <p className="text-sm text-gray-500 leading-relaxed border-t border-dashed border-gray-100 pt-4">{generalidades}</p>
      )}

      <div className="grid grid-cols-2 gap-4 border-t border-dashed border-gray-100 pt-4">
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Día y fecha</p>
            <p className="text-sm font-medium text-gray-800 capitalize">{fmtFecha(date)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Hora</p>
            <p className="text-sm font-medium text-gray-800">{fmt12(startTime)} - {fmt12(endTime)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 col-span-2">
          <MapPin className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Sede</p>
            <p className="text-sm font-medium text-gray-800">San Salvador, El Salvador</p>
          </div>
        </div>
      </div>

      {pagoOnline ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div>
              <span className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                {depositPagado ? <CheckCircle2 className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                {depositPagado ? "Anticipo pagado" : "Anticipo a pagar ahora"}
              </span>
              <span className="text-xs text-emerald-600/80">
                {depositPagado ? "Ya cubierto al agendar esta cita" : "50% del total, para apartar tu hora"}
              </span>
            </div>
            <span className="text-xl font-bold text-emerald-700">${Number(deposit).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
            <span className="text-xs text-gray-500">Resto a pagar en recepción</span>
            {/* Math.max(0, ...): al reagendar, el anticipo ya pagado queda fijo aunque el
                total cambie (ver rescheduleMyAppointment en el backend); si el paciente
                cambia a un procedimiento más barato que su anticipo ya pagado, total -
                deposit da negativo — mostrar "-$5.00" de resto a pagar es confuso, se
                muestra $0.00 en su lugar (ya está cubierto, no se le debe nada). */}
            <span className="text-sm font-semibold text-gray-700">${Math.max(0, Number(total) - Number(deposit)).toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 px-1">El anticipo no es reembolsable si cancelas la cita.</p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div>
            <span className="text-sm text-emerald-700 font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Monto a pagar
            </span>
            <span className="text-xs text-emerald-600/80">Efectivo o tarjeta en recepción</span>
          </div>
          <span className="text-xl font-bold text-emerald-700">${Number(total).toFixed(2)}</span>
        </div>
      )}

      {instructions && (
        <div className="flex items-start gap-2 bg-[#3B6FCA]/5 rounded-xl p-3 border border-[#3B6FCA]/10">
          <Info className="w-4 h-4 text-[#3B6FCA] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Antes de tu cita</p>
            <p className="text-xs text-gray-500 mt-0.5">{instructions}</p>
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-300" /> Tu información está segura con nosotros
      </p>
    </div>
  </div>
);

export default TicketCita;