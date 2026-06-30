import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ReceptionistsTable = ({
  receptionists,
  loading,
  error,
  onOpenForm,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return <p className="mt-5">Cargando recepcionistas...</p>;
  }

  if (error) {
    return (
      <p className="mt-5 text-red-500">
        Error: {error}
      </p>
    );
  }

  return (
    <>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>DUI</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {receptionists.length > 0 ? (
              receptionists.map((receptionist) => (
                <TableRow
                  key={receptionist._id}
                  className="hover:bg-slate-50"
                >
                  <TableCell>
                    <img
                      src={receptionist.img_url}
                      alt={receptionist.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </TableCell>

                  <TableCell>
                    {receptionist.name}
                  </TableCell>

                  <TableCell>
                    {receptionist.last_name}
                  </TableCell>

                  <TableCell>
                    {receptionist.dui}
                  </TableCell>

                  <TableCell>
                    {receptionist.email}
                  </TableCell>

                  <TableCell>
                    {receptionist.phone}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        receptionist.is_active
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {receptionist.is_active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          onEdit(receptionist)
                        }
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar a ${receptionist.name}?`
                            )
                          ) {
                            onDelete(
                              receptionist._id
                            );
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-4"
                >
                  No hay recepcionistas registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default ReceptionistsTable;