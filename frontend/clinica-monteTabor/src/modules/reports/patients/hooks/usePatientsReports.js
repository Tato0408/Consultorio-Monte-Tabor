import { useState, useEffect } from "react";
import { pacientesTopCards, pacientesSections } from "../../reportsData";

const usePacientesReport = () => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTopCards(pacientesTopCards);
      setSections(pacientesSections);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { loading, topCards, sections };
};

export default usePacientesReport;