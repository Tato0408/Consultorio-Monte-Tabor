import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

// Misma implementación visual usada en el portal público, aislada para no
// cambiar otros calendarios del panel privado.
export function PublicStyleCalendar({ className, classNames, components, ...props }) {
  return <DayPicker showOutsideDays className={cn("rounded-xl border border-slate-100 bg-white p-3", className)}
    classNames={{
      months: "flex flex-col", month: "space-y-3", caption: "relative flex items-center justify-center py-1",
      caption_label: "absolute inset-x-0 mt-1 text-center text-sm font-bold text-slate-800 pointer-events-none", nav: "flex items-center gap-1",
      button_previous: "absolute left-1 mt-6 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100",
      button_next: "absolute right-1 mt-6 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100",
      table: "w-full border-collapse", head_row: "flex", head_cell: "w-9 text-xs font-semibold text-slate-400",
      row: "mt-1 flex w-full", cell: "relative h-9 w-9 p-0 text-center", day: "h-9 w-9 rounded-full text-sm font-medium text-slate-700 hover:bg-blue-50",
      day_selected: "bg-[#0b66d6] text-white hover:bg-[#0b66d6]", day_today: "bg-slate-100 font-bold", day_outside: "text-slate-300", day_disabled: "text-slate-300 opacity-50", ...classNames,
    }}
    components={{ Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />, ...components }} {...props} />;
}
