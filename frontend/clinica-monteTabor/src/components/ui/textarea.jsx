import * as React from "react"

import { cn } from "@/lib/utils"

// Cuando el textarea trae maxLength, se muestra un contador "actual/máximo" abajo a la
// derecha — mismo criterio que InputField.jsx. Los textarea del sistema siempre son campos de
// texto libre para agregar/editar algo (notas, motivo de cancelación, etc.), nunca del tipo
// "login" (correo/contraseña), así que aquí no hace falta excluir por tipo.
function Textarea({
  className,
  value,
  maxLength,
  ...props
}) {
  const showCount = maxLength != null;
  const currentLength = String(value ?? "").length;

  return (
    <div className="flex flex-col gap-1">
      <textarea
        data-slot="textarea"
        value={value}
        maxLength={maxLength}
        className={cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props} />
      {showCount && (
        <span className="self-end text-[11px] text-muted-foreground">
          {currentLength}/{maxLength}
        </span>
      )}
    </div>
  );
}

export { Textarea }
