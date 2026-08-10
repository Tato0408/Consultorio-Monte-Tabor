const PrimaryButton = ({ children, loading, disabled, ...props }) => {
  return (
    <button
      {...props}
      // Se desactiva solo con "loading" aunque el padre olvide pasar también "disabled" —
      // evita que un doble clic dispare la petición dos veces mientras el botón dice "Cargando..."
      disabled={disabled || loading}
      className="w-full py-4 rounded-lg bg-[#3B6FCA] hover:bg-[#2D5BB5] text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Cargando..." : children}
    </button>
  );
};

export default PrimaryButton;