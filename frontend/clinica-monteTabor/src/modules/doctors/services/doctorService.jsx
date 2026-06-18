const API_URL = "http://localhost:4000/api/doctors";

export const doctorService = {
//Obtener todas las citas (GET)
 getAll: async () => {
 try {
 const response = await fetch(API_URL);
 if (!response.ok) {
 throw new Error(`Error HTTP: ${response.status}`);
 }
 return await response.json();
 } catch (error) {
 console.error("Error al obtener los doctores:", error);
 throw error;
 }
 },

//Obtener una sola cita por su ID (GET)
 getById: async (id) => {
 try {
 const response = await fetch(`${API_URL}/${id}`);
 if (!response.ok) {
 throw new Error(`Error HTTP: ${response.status}`);
 }
 return await response.json();
 } catch (error) {
 console.error(`Error al obtener la cita con ID ${id}:`, error);
 throw error;
 }
 },

//Crear una nueva cita (POST)
 create: async (doctorsData) => {
 try {
 const response = await fetch(API_URL, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(doctorsData),
 });

 const data = await response.json();
 if (!response.ok) {
 throw new Error(data.message || `Error HTTP: ${response.status}`);
 }
 return data;
 } catch (error) {
 console.error("Error al crear el doctor:", error);
 throw error;
 }
 },

//Actualizar una cita existente por ID (PUT)
 update: async (id, doctorsData) => {
 try {
 const response = await fetch(`${API_URL}/${id}`, {
 method: "PUT",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(doctorsData),
 });

 const data = await response.json();
 if (!response.ok) {
 throw new Error(data.message || `Error HTTP: ${response.status}`);
 }
 return data;
 } catch (error) {
 console.error(`Error al actualizar el doctor con ID ${id}:`, error);
 throw error;
 }
 },

//Eliminar una cita por ID (DELETE)
 delete: async (id) => {
 try {
 const response = await fetch(`${API_URL}/${id}`, {
 method: "DELETE",
 });
 if (!response.ok) {
 throw new Error(`Error HTTP: ${response.status}`);
 }
 return await response.json();
 } catch (error) {
 console.error(`Error al eliminar el doctor con ID ${id}:`, error);
 throw error;
 }
 }
};