import { useEffect, useState } from "react";

const useMedicalData = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    try {
      const [patientsRes, doctorsRes, nursesRes] =
        await Promise.all([
          fetch("http://localhost:4000/api/patients"),
          fetch("http://localhost:4000/api/doctors"),
          fetch("http://localhost:4000/api/nurses"),
        ]);

      const patientsData = await patientsRes.json();
      const doctorsData = await doctorsRes.json();
      const nursesData = await nursesRes.json();

      setPatients(patientsData);
      setDoctors(doctorsData);
      setNurses(nursesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    patients,
    doctors,
    nurses,
    loadingData,
  };
};

export default useMedicalData;