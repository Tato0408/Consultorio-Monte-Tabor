import { useState, useEffect } from "react";
import { inventarioTopCards, inventarioSections } from "../../reportsData";

const useInventarioReport = () => {
  const [loading, setLoading] = useState(true);
  const [topCards, setTopCards] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTopCards(inventarioTopCards);
      setSections(inventarioSections);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return { loading, topCards, sections };
};

export default useInventarioReport;
