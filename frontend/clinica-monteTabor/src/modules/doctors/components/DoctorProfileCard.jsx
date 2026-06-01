import React from "react";
import { UserRound } from "lucide-react";

const DoctorProfileCard = () => {
  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-blue-600 text-white p-6 flex flex-col items-center">
        <UserRound size={60} />

        <h3 className="font-semibold mt-3">
          Gabriela Isabel Castillo Mena
        </h3>
      </div>

      <div className="p-5 space-y-4 text-sm">
        <div>
          <span className="font-semibold">
            Género:
          </span>{" "}
          Femenino
        </div>

        <div>
          <span className="font-semibold">
            Edad:
          </span>{" "}
          18
        </div>

        <div>
          <span className="font-semibold">
            DUI:
          </span>{" "}
          12313819-7
        </div>

        <div>
          <span className="font-semibold">
            Teléfono:
          </span>{" "}
          8594-8174
        </div>

        <div>
          <span className="font-semibold">
            Email:
          </span>{" "}
          ejemplo@gmail.com
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileCard;