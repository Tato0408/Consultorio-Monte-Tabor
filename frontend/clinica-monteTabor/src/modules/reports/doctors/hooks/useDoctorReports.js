import { useState, useEffect } from "react";
import { doctoresTopCards, doctoresSections } from "../../reportsData";

const useDoctoresReport = () => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTopCards(doctoresTopCards);
      setSections(doctoresSections);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { loading, topCards, sections };
};

export default useDoctoresReport;