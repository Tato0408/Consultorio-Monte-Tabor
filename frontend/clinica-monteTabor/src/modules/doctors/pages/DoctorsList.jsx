import React, { useState, useEffect } from "react";

//Importacion de los subcomponentes que se van a renderizar en la pagina :o
import DoctorsStats from "../components/DoctorsStats";
import TableBar from "../components/TableBar";
import DoctorsTable from "../components/DoctorsTable";
import DoctorProfileCard from "../components/DoctorProfileCard";
import TablePagination from "../components/TablePagination";
import DoctorForm from "../components/DoctorsForm";

//Importa el custom hook que maneja todo el estado global y peticiones de los doctores
import { useDoctors } from "../hooks/useDoctors";
//Importa las funciones personalizadas para mostrar las alertas de exito o error en pantalla
import { showSuccess, showError } from "../../../lib/alerts";

const DoctorsList = () => {
  //Desestructura las propiedades y funciones necesarias que vienen desde el custom hook
  const {
    doctors,
    loading,
    error,
    getDoctors,
    searchDoctors,
    deleteDoctor,
  } = useDoctors();

  //useState para guardar el objeto del doctor que el usuario selecciono para ver su perfil detallado
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  //useState de tipo booleano para controlar si el modal del formulario esta abierto (true) o cerrado (false)
  const [isFormOpen, setIsFormOpen] = useState(false);
  //useState para almacenar los datos del doctor que se va a modificar (si viene nulo significa que es un registro nuevo)
  const [doctorToEdit, setDoctorToEdit] = useState(null);
  //useState para guardar el texto que el usuario va escribiendo en la barra de busqueda
  const [search, setSearch] = useState("");


  //ESTADOS PARA LA PAGINACIoN
  //useState para controlar el numero de la pagina activa en la que esta parado el usuario
  const [currentPage, setCurrentPage] = useState(1);
  //useState para definir cuantos doctores se van a mostrar por cada pagina en la tabla
  const [itemsPerPage, setItemsPerPage] = useState(8);
zl
  //BUSCADOR
  //Funcion asincrona que se dispara cada vez que cambia el valor de la barra de busqueda
  const handleSearch = async (value) => {
    //Actualiza el estado local de search con el nuevo texto ingresado
    setSearch(value);
    //Ejecuta la funcion del hook para realizar el filtro mandando el texto a la api
    await searchDoctors(value);
  };

  //useEffect que se ejecuta de forma automatica una sola vez cuando el componente se monta en la pantalla
  useEffect(() => {
    //Llama a la funcion para traer todos los doctores de inmediato al cargar la pagina
    getDoctors();
  }, []); //Array de dependencias vacio asegura que solo corra al inicio

  // Resetear a página 1 si cambia la cantidad de registros o filas por página
  //useEffect pendiente de los cambios en el texto de busqueda o la cantidad de items por pagina
  useEffect(() => {
    //Devuelve la paginacion de la tabla a la pagina 1 para evitar errores de visualizacion
    setCurrentPage(1);
  }, [search, itemsPerPage]); //Se dispara unicamente cuando alguna de estas dos variables cambia

  //useEffect para sincronizar y mantener seleccionado al doctor correcto en la tarjeta lateral de perfil
  useEffect(() => {
    //Evalua si el array de doctores tiene elementos cargados
    if (doctors.length > 0) {
      //Busca dentro del array general si el doctor seleccionado actualmente todavia existe en la lista
      const exists = doctors.find(
        (d) => d._id === selectedDoctor?._id
      );

      //Si no se encuentra seleccionado a nadie o el que estaba seleccionado ya no existe
      if (!exists) {
        //Le asigna por defecto el primer doctor del array para que la tarjeta no quede vacia
        setSelectedDoctor(doctors[0]);
      }
    } else {
      //Si el array de doctores viene totalmente vacio limpia el estado dejandolo en null
      setSelectedDoctor(null);
    }
  }, [doctors, selectedDoctor]); //Se ejecuta cada vez que cambia la lista de doctores o el doctor seleccionado

  //ABRIR CREAR
  //Funcion para limpiar los datos de edicion y abrir el formulario en modo de creacion nuevo
  const handleOpenCreate = () => {
    //Pone el doctor a editar en null para avisarle al modal que es un registro limpio
    setDoctorToEdit(null);
    //Cambia el estado a true para mostrar el modal del formulario en la pantalla
    setIsFormOpen(true);
  };

  //ABRIR EDITAR
  //Funcion que recibe los datos de un doctor especifico para abrir el formulario listo para modificar
  const handleOpenEdit = (doctor) => {
    //Guarda el objeto del doctor seleccionado en el estado doctorToEdit
    setDoctorToEdit(doctor);
    //Cambia el estado a true para desplegar el modal con los datos ya precargados
    setIsFormOpen(true);
  };

  // ==========================
  // CERRAR FORMULARIO
  // ==========================
  //Funcion asincrona que se encarga de ocultar el modal y refrescar la tabla al terminar una accion
  const handleCloseForm = async () => {
    //Cambia el estado a false para ocultar el modal de la pantalla
    setIsFormOpen(false);
    //Vuelve a consultar el api para traer la lista de doctores actualizada con los ultimos cambios
    await getDoctors();

    //Evalua si habia un objeto en doctorToEdit para saber si fue una actualizacion o una creacion
    if (doctorToEdit) {
      //Muestra la alerta de exito indicando que el doctor fue actualizado correctamente
      showSuccess(
        "Doctor actualizado",
        "La información del doctor fue actualizada correctamente."
      );
    } else {
      //Muestra la alerta de exito detallando que el doctor nuevo se agrego de forma correcta
      showSuccess(
        "Doctor agregado",
        "El doctor fue registrado correctamente."
      );
    }

    //Limpia el estado de edicion dejandolo de nuevo en null para futuros formularios
    setDoctorToEdit(null);
  };

  // ==========================
  // ELIMINAR DIRECTO
  // ==========================
  //Funcion asincrona que procesa el borrado de un doctor de la tabla por medio de su id unico
  const handleDeleteDoctor = async (id) => {
    //El try sirve para atrapar cualquier error o fallo que ocurra durante el proceso de eliminacion
    try {
      //Llama a la funcion del hook pasandole el id para borrarlo de la base de datos y cloudinary
      await deleteDoctor(id);
      //Vuelve a cargar la lista general de doctores para actualizar la tabla inmediatamente
      await getDoctors();

      //Despliega el mensaje emergente avisando que el doctor se elimino de forma exitosa
      showSuccess(
        "Doctor eliminado",
        "El doctor fue eliminado correctamente."
      );

      //Comprueba si el doctor que acaban de borrar era el mismo que se estaba mostrando en la tarjeta de perfil
      if (selectedDoctor?._id === id) {
        //Limpia el estado de seleccion para evitar errores de renderizado con un dato inexistente
        setSelectedDoctor(null);
      }
    } catch (error) {
      //Si el bloque try falla imprime el error detallado en la consola del navegador
      console.error(error);
      //Muestra la alerta de tipo error avisando al usuario que no se pudo completar el borrado
      showError(
        "Error",
        error.message || "No se pudo eliminar el doctor."
      );
    }
  };

  //Guarda la cantidad total de registros que tiene el array de doctores actualmente
  const totalItems = doctors.length;
  //Calcula el numero total de paginas dividiendo el total de registros entre las filas deseadas
  //el Math.ceil redondea hacia arriba y el || 1 asegura que al menos devuelva una pagina si esta vacio
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  //Determina el indice del ultimo registro que pertenece a la pagina activa multiplicando la pagina por las filas
  const indexOfLastItem = currentPage * itemsPerPage;
  //Determina el indice del primer registro restando la cantidad de items por pagina al indice del ultimo item
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  //Corta el array original usando .slice() para obtener unicamente el fragmento de doctores que corresponden a la pagina actual
  const currentItems = doctors.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-8 bg-white min-h-screen w-full">
      {/* SECCIÓN DEL ENCABEZADO */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Doctores</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gestiona y administra a los diferentes doctores
        </p>
      </div>

      {/* Renderiza las tarjetas de estadisticas pasandole el array completo de doctores y el estado de carga */}
      <DoctorsStats doctors={doctors} loading={loading} />

      {/* CONTENEDOR EN REJILLA DE 12 COLUMNAS */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        {/* COLUMNA DE LA IZQUIERDA (TABLA Y PAGINADOR) */}
        <div className="col-span-8">
          {/* Renderiza la barra superior de la tabla vinculando el estado de busqueda y la funcion para abrir el creador */}
          <TableBar
            search={search}
            setSearch={handleSearch}
            onAdd={handleOpenCreate}
          />

          {/* Enviamos únicamente los registros cortados para la página actual */}
          {/* Muestra la tabla inyectandole solamente los doctores segmentados del currentItems y las funciones de seleccion, edicion y borrado */}
          <DoctorsTable
            doctors={currentItems}
            loading={loading}
            error={error}
            onSelectDoctor={setSelectedDoctor}
            onOpenForm={handleOpenCreate}
            onEditDoctor={handleOpenEdit}
            onDeleteDoctor={handleDeleteDoctor}
          />

          {/* Enlazamos todas las props requeridas al paginador */}
          {/* Muestra los controles de navegacion vinculandole los estados correspondientes y las funciones de avanzar o retroceder pagina */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            //Math.min asegura que al avanzar de pagina no se pase del limite maximo de paginas totales
            onNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            //Math.max asegura que al retroceder de pagina nunca baje del numero 1
            onPrevPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          />
        </div>

        {/* COLUMNA DE LA DERECHA (TARJETA DE PERFIL) */}
        <div className="col-span-4">
          {/* Renderiza el visualizador lateral pasando los datos del doctor que se encuentra seleccionado actualmente */}
          <DoctorProfileCard doctor={selectedDoctor} />
        </div>
      </div>

      {/* MODAL DEL FORMULARIO DE REGISTRO / EDICIÓN */}
      {/* La prop key fuerza a React a destruir y reconstruir el componente desde cero cada vez que cambia el id del doctor a editar */}
      <DoctorForm
        key={doctorToEdit?._id || "new"}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        doctor={doctorToEdit}
        refreshDoctors={getDoctors}
      />
    </div>
  );
};

export default DoctorsList;