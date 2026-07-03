import { useState, useEffect } from "react";
import {
  treatmentsStats,
  treatmentsPatients,
  evolutionChartData,
  upcomingControlsList,
} from "../data/treatmentsData";

const useTreatmentsFollowUp = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [upcomingControls, setUpcomingControls] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats(treatmentsStats);
      setPatients(treatmentsPatients);
      setChartData(evolutionChartData);
      setUpcomingControls(upcomingControlsList);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return { loading, stats, patients, chartData, upcomingControls };
};

export default useTreatmentsFollowUp;
