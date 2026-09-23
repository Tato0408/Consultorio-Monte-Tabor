// Guard global anti-doble-clic: en vez de tocar cada uno de los ~350 botones del panel
// (ninguno pasa por un componente Button compartido de forma consistente, ver el
// componente en components/ui/button.jsx, casi sin adoptar fuera de AppointmentsGrid.jsx),
// se instala un solo listener en fase de captura sobre document. Corre ANTES que
// cualquier onClick de React, así que un segundo clic sobre el mismo botón dentro de la
// ventana de espera nunca llega a disparar su handler.
//
// Es un debounce por elemento (bloquea repetir EL MISMO botón muy rápido), no un
// "deshabilitar hasta que la petición termine": eso exigiría tocar cada handler async uno
// por uno, que es justo lo que este enfoque evita.
const COOLDOWN_MS = 700;

export function installClickGuard() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest("button, [role='button']");
      if (!target) return;

      if (target.dataset.guardBusy === "1") {
        // Ya se procesó un clic sobre este mismo botón hace poco: se descarta este
        // antes de que React o el propio navegador (submit de un form, etc.) lo vean.
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }

      if (target.disabled) return;

      target.dataset.guardBusy = "1";
      setTimeout(() => delete target.dataset.guardBusy, COOLDOWN_MS);
    },
    true
  );
}

export default installClickGuard;
