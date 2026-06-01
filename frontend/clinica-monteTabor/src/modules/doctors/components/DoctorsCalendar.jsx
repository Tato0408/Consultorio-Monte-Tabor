
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const DoctorsCalendar = () => {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold mb-4">
        Días atendidos
      </h2>

      <Calendar />
    </div>
  );
};

export default DoctorsCalendar;