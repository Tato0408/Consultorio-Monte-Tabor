import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/apiClient";

//Custom hook, aqui agrupamos todo el estado y funciones de los doctores
//para poder reutilizarlos facilmente en cualquier componente de las vistas
export const useDoctors = () => {
  //useState sirve para definir un estado que guardara el array de doctores vacio al inicio
  const [doctors, setDoctors] = useState([]);
  //useState para manejar el estado de carga y saber si la peticion esta activa
  const [loading, setLoading] = useState(false);
  //useState para atrapar y guardar cualquier mensaje de error que pueda ocurrir
  const [error, setError] = useState(null);

  //GET ALL
  //useCallback sirve para memorizar la funcion y evitar que se vuelva a recrear
  //en cada renderizado del componente si sus dependencias no cambian
  const getDoctors = useCallback(async () => {
    //El try sirve para capturar cualquier error que ocurra durante la peticion api
    try {
      //Pone el estado loading en true para avisar a la vista que empezo a cargar los datos
      setLoading(true);
      //Limpia cualquier error que haya quedado de intentos anteriores
      setError(null);

      //Llama a apiClient para hacer la peticion GET a la ruta de los doctores
      const data = await apiClient("/doctors");

      //Guarda los datos devueltos por el api dentro de nuestro estado doctors
      setDoctors(data);
    } catch (err) {
      //Si ocurre un error durante la peticion muestra un mensaje en la consola
      console.error("Error al obtener los doctores:", err);
      //Guarda el texto exacto del error en el estado error para mostrarlo en la vista
      setError(err.message);
    } finally {
      //El finally siempre se ejecuta al terminar todo el proceso y cambia el loading a false
      setLoading(false);
    }
  }, []); //Array de dependencias vacio significa que la funcion solo se crea una vez al montar

  //SEARCH
  //useCallback memoriza la busqueda de doctores basandose en el texto que reciba
  const searchDoctors = useCallback(async (search) => {
    try {
      setLoading(true);
      setError(null);

      //Evalua si el texto viene vacio o solo con puros espacios en blanco usando .trim()
      if (!search.trim()) {
        //Al no haber texto ejecuta la funcion getDoctors para traer a todos de nuevo
        return await getDoctors();
      }

      //Hace la peticion mandando el parametro search por query y encodeURIComponent limpia caracteres especiales
      const data = await apiClient(
        `/doctors/search?search=${encodeURIComponent(search)}`
      );

      //Guarda los doctores filtrados encontrados en el estado doctors
      setDoctors(data);
    } catch (err) {
      console.error("Error al buscar doctores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getDoctors]); //Se agrega getDoctors como dependencia porque la estamos llamando adentro
  


  //GET BY ID
  //Funcion asincrona para obtener los detalles de un solo doctor mediante su id unico
  const getDoctorById = async (id) => {
    try {
      //Hace la peticion a la url especifica concatenandole el id recibido
      return await apiClient(`/doctors/${id}`);
    } catch (err) {
      console.error(
        `Error al obtener el doctor con ID ${id}:`,
        err
      );
      //Usa el throw para relanzar el error y que el componente de la vista pueda atraparlo
      throw err;
    }
  };

  //CREATE
  //Funcion asincrona (es decir q sucede en segundo plano)
  // para registrar un doctor enviando un formulario con datos e imagenes
  const createDoctor = async (formData) => {
    try {
      //Hace una peticion de tipo POST pasando el formData dentro del body de las opciones
      const data = await apiClient("/doctors", {
        method: "POST",
        body: formData,
      });

      //Vuelve a mandar a llamar a getDoctors para que la lista general de la vista se actualice
      await getDoctors();

      //Devuelve la respuesta del servidor indicando que fue creado correctamente
      return data;
    } catch (err) {
      console.error("Error al crear el doctor:", err);
      throw err;
    }
  };

  //UPDATE
  //Funcion asincrona para modificar la informacion de un doctor por medio de su id
  const updateDoctor = async (id, formData) => {
    try {
      //Hace la peticion mandando el metodo PUT a la url con el id del doctor que editamos
      const data = await apiClient(`/doctors/${id}`, {
        method: "PUT",
        body: formData,
      });

      //Vuelve a llamar a la funcion general para actualizar la tabla con los datos nuevos
      await getDoctors();

      return data;
    } catch (err) {
      console.error(
        `Error al actualizar el doctor con ID ${id}:`,
        err
      );
      throw err;
    }
  };

  //DELETE
  //Funcion asincrona para eliminar de forma fisica o logica a un doctor usando su identificador id
  const deleteDoctor = async (id) => {
    try {
      //Manda una peticion indicando el metodo DELETE en la configuracion a la api
      const data = await apiClient(`/doctors/${id}`, {
        method: "DELETE",
      });

      //Vuelve a consultar a todos los doctores para refrescar la lista sin el registro eliminado
      await getDoctors();

      return data;
    } catch (err) {
      console.error(
        `Error al eliminar el doctor con ID ${id}:`,
        err
      );
      throw err;
    }
  };

  //useEffect sirve para ejecutar codigo de forma automatica en el ciclo de vida del componente
  useEffect(() => {
    //Llama a getDoctors al cargar por primera vez la vista para que traiga todos los registros de inmediato
    getDoctors();
  }, [getDoctors]); //Se dispara de nuevo unicamente si la referencia de getDoctors llega a cambiar

  //Al final devolvemos un objeto con todos nuestros estados y funciones compartidas
  //para que puedan ser desestructurados en las vistas que utilicen este hook
  return {
    doctors,
    loading,
    error,
    getDoctors,
    searchDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor,
  };
};