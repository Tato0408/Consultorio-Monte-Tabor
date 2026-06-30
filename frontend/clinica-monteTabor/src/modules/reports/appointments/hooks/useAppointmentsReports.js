import { useState, useEffect } from "react";
import { citasTopCards, citasSections } from "../../reportsData";

const useCitasReport = () => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    // Simula un fetch con un pequeño delay para que el skeleton se vea
    const timer = setTimeout(() => {
      setTopCards(citasTopCards);
      setSections(citasSections);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { loading, topCards, sections };
};

export default useCitasReport;