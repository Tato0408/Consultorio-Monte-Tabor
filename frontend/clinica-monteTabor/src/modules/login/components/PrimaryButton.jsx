const PrimaryButton = ({ children, loading, disabled, ...props }) => {
  return (
    <button
      {...props}
      // Se desactiva cuando loading es true, aunque el padre no pase
      // el prop disabled explícitamente. Así se evita que un doble
      // clic envíe la petición dos veces mientras el botón muestra
      // el texto de carga.
      disabled={disabled || loading}
      className="w-full py-4 rounded-lg bg-[#3B6FCA] hover:bg-[#2D5BB5] text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Cargando..." : children}
    </button>
  );
};

export default PrimaryButton;