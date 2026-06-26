import Swal from "sweetalert2";

export const showSuccess = (title, message) => {
    return Swal.fire({
        icon: "success",
        title,
        text: message,
        showConfirmButton: false,
        timer: 1500
    });
};

export const showError = (title, message) => {
    return Swal.fire({
        icon: "error",
        title,
        text: message,
        confirmButtonColor: "#ef4444",
    });
};

export const showWarning = (title, message) => {
    return Swal.fire({
        icon: "warning",
        title,
        text: message,
        confirmButtonColor: "#f59e0b",
    });
};

export const confirmDelete = async () => {
    const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#ef4444",
    });

    return result.isConfirmed;
};