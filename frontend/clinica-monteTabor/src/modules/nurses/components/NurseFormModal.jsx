import { useState, useEffect, useRef } from "react";
import { User, Plus, Loader2, Lock, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { showSuccess, showError } from "@/lib/alerts";
const NurseFormModal = ({ isOpen, onClose, onSave, nurse }) => {
  const isEditMode = !!nurse; 
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estado para los errores individuales de cada input
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    phone: "",
    email: "",
    dui: "",
    birth_date: "",
    password: "",       
    is_active: true,    
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (nurse) {
      setFormData({
        name: nurse.name || "",
        last_name: nurse.last_name || "",
        phone: nurse.phone || "",
        email: nurse.email || "",
        dui: nurse.dui || "",
        birth_date: nurse.birth_date ? nurse.birth_date.split("T")[0] : "",
        password: "", 
        is_active: nurse.is_active !== undefined ? nurse.is_active : true,
      });
      setImagePreview(nurse.img_url || null);
    } else {
      setFormData({
        name: "", last_name: "", phone: "", email: "", dui: "", birth_date: "", password: "", is_active: true,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setError("");
    setFieldErrors({}); // Limpiamos errores al abrir
    setShowPassword(false);
  }, [nurse, isOpen]);

  const passwordValidations = {
    hasMinLength: formData.password.length > 8,
    hasMixedCase: /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password),
    hasNumbers: /\d/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  if (!isOpen) return null;

  const handleChange = (e) => {
    let { name, value } = e.target;

    // 1. MÁSCARA PARA TELÉFONO (Bloquea letras/símbolos y formatea XXXX-XXXX)
    if (name === "phone") {
      let digits = value.replace(/\D/g, ""); // Elimina todo lo que NO sea número
      if (digits.length > 8) digits = digits.slice(0, 8); // Máximo 8 números
      
      if (digits.length > 4) {
        value = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      } else {
        value = digits;
      }
    }

    // 2. MÁSCARA PARA DUI (Bloquea letras/símbolos y formatea XXXXXXXX-X)
    if (name === "dui") {
      let digits = value.replace(/\D/g, ""); // Elimina todo lo que NO sea número
      if (digits.length > 9) digits = digits.slice(0, 9); // Máximo 9 números
      
      if (digits.length > 8) {
        value = `${digits.slice(0, 8)}-${digits.slice(8)}`;
      } else {
        value = digits;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpia el error debajo del input al momento en que el usuario empieza a escribir nuevamente
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleStatusChange = (statusValue) => {
    setFormData((prev) => ({ ...prev, is_active: statusValue }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Función de validación de formatos antes de enviar
  const validateFields = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{4}-\d{4}$/;
    const duiRegex = /^\d{8}-\d{1}$/;

    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Formato de correo electrónico: nombre@dominio.com";
    }
    
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = "Formato de número de teléfono: XXXX-XXXX";
    }

    if (formData.dui && !duiRegex.test(formData.dui)) {
      errors.dui = "Formato de DUI: XXXXXXXX-X";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ejecutar validaciones locales
    const currentErrors = validateFields();
    if (Object.keys(currentErrors).length > 0) {
      setFieldErrors(currentErrors); // Mostrar los mensajes en rojo
      return; // Detener la función si hay errores
    }

    if (!isEditMode && !isPasswordValid) {
      setError("La contraseña debe cumplir con todos los requisitos de seguridad.");
      return;
    }

    setLoading(true);
    setError("");

    const data = new FormData();
    data.append("name", formData.name);
    data.append("last_name", formData.last_name);
    data.append("phone", formData.phone);
    data.append("email", formData.email);
    data.append("dui", formData.dui);
    data.append("birth_date", formData.birth_date);
    
    if (isEditMode) {
      data.append("is_active", formData.is_active);
    } else {
      data.append("password", formData.password);
    }

    if (imageFile) {
      data.append("img_url", imageFile);
    }

    const result = await onSave(data);
    setLoading(false);

    if (result?.success) {
      showSuccess("Enfermera guardada correctamente");
      onClose();
    } else {
      showError(result?.error || "Ocurrió un error al procesar el formulario");
    }
  };

  const ValidationRow = ({ checked, label }) => (
    <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${checked ? "text-green-600" : "text-gray-400"}`}>
      {checked ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] w-full max-w-[560px] p-8 flex flex-col items-center shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
        
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

        <div className="relative mb-6 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-[#F3F4F6] border border-gray-100 flex items-center justify-center overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md group-hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Nombres</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Ingrese los nombres" className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-300" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Apellidos</label>
              <input type="text" name="last_name" required value={formData.last_name} onChange={handleChange} placeholder="Ingrese los apellidos" className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-300" />
            </div>

            {/* Modificado con etiqueta de error */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Teléfono</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="0000-0000" 
                className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-colors placeholder:text-gray-300 ${fieldErrors.phone ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`} 
              />
              {fieldErrors.phone && <span className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.phone}</span>}
            </div>

            {/* Modificado con etiqueta de error */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Correo electrónico</label>
              <input 
                type="email" 
                name="email" 
                required 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="Correo@gmail.com" 
                className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-colors placeholder:text-gray-300 ${fieldErrors.email ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`} 
              />
              {fieldErrors.email && <span className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.email}</span>}
            </div>

            {/* Modificado con etiqueta de error */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">DUI</label>
              <input 
                type="text" 
                name="dui" 
                value={formData.dui} 
                onChange={handleChange} 
                placeholder="00000000-0" 
                className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-colors placeholder:text-gray-300 ${fieldErrors.dui ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-blue-500"}`} 
              />
              {fieldErrors.dui && <span className="text-[10px] text-red-500 font-medium px-1">{fieldErrors.dui}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-400">Fecha de nacimiento</label>
              <input type="date" name="birth_date" required value={formData.birth_date} onChange={handleChange} className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700" />
            </div>

            {isEditMode && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-400">Estado de la cuenta</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleStatusChange(true)} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.is_active ? "bg-green-50 text-green-700 border-green-200 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Activo</button>
                  <button type="button" onClick={() => handleStatusChange(false)} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${!formData.is_active ? "bg-red-50 text-red-700 border-red-200 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>Inactivo</button>
                </div>
              </div>
            )}
          </div>

          {!isEditMode && (
            <div className="flex flex-col gap-3 w-full border-t border-gray-100 pt-4 mt-2">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-gray-700">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleChange} placeholder="Ingresa tu contraseña" className="w-full pl-9 pr-10 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400 font-medium" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <ValidationRow checked={passwordValidations.hasMinLength} label="La contraseña tiene más de 8 dígitos" />
                <ValidationRow checked={passwordValidations.hasMixedCase} label="La contraseña contiene mayúsculas y minúsculas" />
                <ValidationRow checked={passwordValidations.hasNumbers} label="La contraseña incluye números" />
                <ValidationRow checked={passwordValidations.hasSpecialChar} label="Las contraseñas incluyen caracteres especiales" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 w-full">
            <button type="button" disabled={loading} onClick={onClose} className="w-32 border border-blue-600 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-xs text-center disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={loading} className="w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-xs flex items-center justify-center gap-1 disabled:opacity-70">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NurseFormModal;