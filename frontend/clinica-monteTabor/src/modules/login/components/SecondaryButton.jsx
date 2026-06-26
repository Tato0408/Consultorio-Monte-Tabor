import { Link } from "react-router-dom";

const SecondaryButton = ({ to, children }) => {
  return (
    <Link
      to={to}
      className="flex items-center justify-center w-full py-4 border rounded-lg text-[#3B6FCA]"
    >
      {children}
    </Link>
  );
};

export default SecondaryButton;