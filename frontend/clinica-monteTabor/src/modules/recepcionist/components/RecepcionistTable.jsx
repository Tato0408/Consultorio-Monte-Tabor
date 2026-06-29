import React, { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

const ReceptionistsTable = ({
  receptionists,
  loading,
  error,
  onEdit,
  onDelete,
}) => {
  const [openMenu, setOpenMenu] =
    useState(null);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-center">
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl border overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-50 border-b">

          <tr className="text-left text-gray-500 text-sm">

            <th className="px-6 py-4">
              Nombre
            </th>

            <th className="px-6 py-4">
              Apellido
            </th>

            <th className="px-6 py-4">
              DUI
            </th>

            <th className="px-6 py-4">
              Teléfono
            </th>

            <th className="px-6 py-4 text-center">
              Acciones
            </th>

          </tr>

        </thead>

        <tbody>

          {receptionists.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-gray-400"
              >
                No hay recepcionistas registrados.
              </td>
            </tr>
          ) : (
            receptionists.map(
              (receptionist) => (
                <tr
                  key={receptionist._id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    {receptionist.firstName}
                  </td>

                  <td className="px-6 py-4">
                    {receptionist.lastName}
                  </td>

                  <td className="px-6 py-4">
                    {receptionist.dui}
                  </td>

                  <td className="px-6 py-4">
                    {receptionist.phone}
                  </td>

                  <td className="px-6 py-4 text-center relative">

                    <button
                      onClick={() =>
                        setOpenMenu(
                          openMenu ===
                            receptionist._id
                            ? null
                            : receptionist._id
                        )
                      }
                      className="p-2 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical
                        size={18}
                      />
                    </button>

                    {openMenu ===
                      receptionist._id && (
                      <div
                        ref={menuRef}
                        className="absolute right-6 mt-2 w-40 bg-white rounded-lg shadow-lg border z-50"
                      >

                        <button
                          onClick={() => {
                            onEdit(
                              receptionist
                            );
                            setOpenMenu(
                              null
                            );
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-sm"
                        >
                          <Pencil
                            size={16}
                          />
                          Editar
                        </button>

                        <button
                          onClick={() => {
                            onDelete(
                              receptionist._id
                            );
                            setOpenMenu(
                              null
                            );
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 text-sm"
                        >
                          <Trash2
                            size={16}
                          />
                          Eliminar
                        </button>

                      </div>
                    )}

                  </td>

                </tr>
              )
            )
          )}

        </tbody>

      </table>

    </div>
  );
};

export default ReceptionistsTable;