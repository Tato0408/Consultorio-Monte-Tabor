import { ShieldCheck } from "lucide-react";
const FooterLogin = () => {
    return (
        <footer className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Todos tus datos están protegidos</span>
          </div>
          <span className="text-xs font-medium text-[#3B6FCA] hover:underline cursor-pointer">
            Consultorio Médico Familiar Monte Tabor
          </span>
        </footer>
    );
};

export default FooterLogin;
