import React from "react";
import {
  UserRound,
  Users,
  Calendar,
  BriefcaseMedical,
} from "lucide-react";

const DoctorsStats = ({ doctors, stats = {}, loading }) => {
  const cards = [
    {
      title: "Doctores",
      value: loading ? "..." : doctors.length,
      icon: UserRound,
    },
    {
      title: "Pacientes",
      value: loading ? "..." : (stats.patients ?? 0),
      icon: Users,
    },
    {
      title: "Citas atendidas",
      value: loading ? "..." : (stats.appointments ?? 0),
      icon: Calendar,
    },
    {
      title: "Procedimientos",
      value: loading ? "..." : (stats.procedures ?? 0),
      icon: BriefcaseMedical,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-5">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4"
        >
          <card.icon className="w-10 h-10 text-blue-600" />

          <div>
            <p className="text-sm text-slate-500">
              {card.title}
            </p>

            <h2 className="text-2xl font-bold">
              {card.value}
            </h2>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DoctorsStats;