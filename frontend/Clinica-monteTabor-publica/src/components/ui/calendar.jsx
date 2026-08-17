import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

// Adaptación del calendario Shadcn usado por el formulario interno.
export function Calendar({ className, classNames, components, ...props }) {
  return <DayPicker
    showOutsideDays
    className={cn("rounded-xl border border-slate-100 bg-white p-3", className)}
    classNames={{
      months: "flex w-full flex-col", month: "w-full space-y-3", caption: "relative flex items-center justify-center py-1",
      caption_label: "absolute inset-x-0 text-center text-sm font-bold text-slate-800 pointer-events-none", nav: "flex items-center gap-1",
      button_previous: "absolute left-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100",
      button_next: "absolute right-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100",
      // react-day-picker v9 usa estos nombres (month_grid, weekdays, week),
      // no los antiguos table/head_row/row. Así la cuadrícula sí se centra.
      month_grid: "!w-auto !mx-auto border-collapse",
      weekdays: "flex justify-center",
      weekday: "w-9 text-xs font-semibold text-slate-400",
      week: "mt-1 flex",
      day: "relative h-9 w-9 p-0 text-center",
      day_button: "h-9 w-9 rounded-full text-sm font-medium text-slate-700 hover:bg-blue-50",
      // En v9 estos estados pertenecen a la celda y el botón es su hijo.
      // Se mantiene el círculo azul de la versión pública original.
      selected: "[&>button]:!h-10 [&>button]:!w-10 [&>button]:!border-2 [&>button]:!border-blue-700 [&>button]:!bg-white [&>button]:!text-base [&>button]:!font-bold [&>button]:!text-blue-700 [&>button]:!shadow-none",
      today: "[&>button]:font-bold",
      outside: "text-slate-300",
      disabled: "text-slate-300 opacity-50",
      ...classNames,
    }}
    components={{ Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />, ...components }}
    {...props}
  />;
}
