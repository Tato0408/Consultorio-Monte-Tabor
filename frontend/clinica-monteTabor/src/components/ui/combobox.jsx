"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, SearchIcon } from "lucide-react"

// Aplana los children de un <ComboboxItem> a texto plano (ej. "Dr. {d.name} {d.last_name}"
// llega como un array de nodos, no como un string). Hace falta un string real para
// itemToStringLabel más abajo: Base UI lo usa tal cual como valor del input, un array ahí se
// vería como "Dr. ,Juan, ,Pérez" (Array.toString une con comas).
function childrenToText(children) {
  return React.Children.toArray(children)
    .map((child) => (typeof child === "string" || typeof child === "number" ? child : ""))
    .join("");
}

// Arma la lista {value, label} a partir de los <ComboboxItem> declarados como hijos, para no
// duplicarla a mano en cada uso disperso por el sistema.
function collectComboboxItems(children) {
  const items = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === ComboboxItem) {
      items.push({ value: child.props.value, label: childrenToText(child.props.children) });
      return;
    }
    if (child.props?.children) {
      items.push(...collectComboboxItems(child.props.children));
    }
  });
  return items;
}

// Dropdown con texto libre: al escribir filtra la lista por lo que se va tecleando
// (comportamiento "recomendados"), y al elegir un ítem el input muestra su label. Mismo
// reemplazo de <select> que ya se usaba en el buscador de pacientes del portal de
// enfermería, ahora como componente reutilizable para cualquier <Combobox> del sistema.
function Combobox({ children, items, ...props }) {
  const resolvedItems = React.useMemo(
    () => items ?? collectComboboxItems(children),
    [children, items]
  );
  // El valor controlado (value/onValueChange) que usa cada <Combobox> del sistema es el id
  // crudo de cada <ComboboxItem value={id}>, no el objeto {value, label} completo — así
  // ningún llamador tuvo que cambiar su lógica al migrar de <select> a este componente
  // (sigue siendo el mismo string que ya guardaban en su estado). Pero por eso mismo Base UI
  // no puede resolver solo la etiqueta a mostrar: su magia automática de {value, label} solo
  // aplica cuando el VALOR de cada item ya es ese objeto completo, no cuando es un id suelto.
  // Sin este resolver, el input mostraba el id tal cual en vez del nombre después de elegir
  // una opción (ver ComboboxTrigger, que renderiza el value controlado como texto). Si el id
  // todavía no aparece en resolvedItems (ej. un value ya elegido mientras su lista de
  // opciones sigue cargando de forma asíncrona, como el catálogo filtrado por horario en
  // QuickAppointmentForm.jsx), el resultado queda en blanco en vez de mostrar el id crudo:
  // ver el mismo id sin resolver es peor que no ver nada mientras se resuelve.
  const itemToStringLabel = React.useCallback(
    (itemValue) => resolvedItems.find((item) => item.value === itemValue)?.label ?? "",
    [resolvedItems]
  );
  return (
    <ComboboxPrimitive.Root items={resolvedItems} itemToStringLabel={itemToStringLabel} {...props}>
      {children}
    </ComboboxPrimitive.Root>
  );
}

function ComboboxTrigger({
  className,
  placeholder,
  size = "default",
  ...props
}) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-trigger"
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50 data-[size=default]:h-8 data-[size=sm]:h-7 dark:bg-input/30",
        className
      )}
      data-size={size}
    >
      <SearchIcon className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        placeholder={placeholder}
        className="w-full min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        {...props}
      />
      <ComboboxPrimitive.Icon
        render={<ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />}
      />
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  ...props
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground empty:m-0 empty:p-0">
            Sin resultados
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxGroup({ className, ...props }) {
  return (
    <ComboboxPrimitive.Group data-slot="combobox-group" className={cn("scroll-my-1 p-1", className)} {...props} />
  );
}

function ComboboxLabel({ className, ...props }) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
      >
        <CheckIcon className="pointer-events-none size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxSeparator({ className, ...props }) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxSeparator,
  ComboboxTrigger,
}
