const PrimaryButton = ({ children, loading, ...props }) => {
  return (
    <button
      {...props}
      className="w-full py-4 rounded-lg bg-[#3B6FCA] hover:bg-[#2D5BB5] text-white font-semibold transition"
    >
      {loading ? "Cargando..." : children}
    </button>
  );
};

export default PrimaryButton;