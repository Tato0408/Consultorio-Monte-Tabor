import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import apiClient from "../../lib/apiClient";
import { showError } from "../../lib/toast";
import { formatLongDate } from "../../utils/date";
import { descargarIncapacidadPdf, descargarRecetaPdf, descargarOrdenLaboratorioPdf, descargarReferenciaPdf } from "../../lib/pdf/patientDocuments";
import { countSelectedTests } from "../../lib/labOrderCatalog";
import FormDateInput from "../../components/profile/FormDateInput";
import styles from "../../styles/documents/documentsStyle";

const TIPO_INFO = {
  incapacidad: { titulo: "Incapacidades", endpoint: "/patient-portal/sick-leaves", fechaCampo: "start_date", icon: "id-card-outline" },
  receta: { titulo: "Recetas", endpoint: "/patient-portal/prescriptions", fechaCampo: "issued_at", icon: "document-text-outline" },
  laboratorio: { titulo: "Órdenes de laboratorio", endpoint: "/patient-portal/lab-orders", fechaCampo: "date", icon: "flask-outline" },
  referencia: { titulo: "Referencias", endpoint: "/patient-portal/referrals", fechaCampo: "date", icon: "swap-horizontal-outline" },
};

const nombreDoctor = (doctor) => (doctor ? `Dr. ${doctor.name} ${doctor.last_name || ""}`.trim() : "Doctor no especificado");

// Misma regla que usePatientRecordDetail.js (expediente clínico, web privada): vigente
// mientras la fecha de finalización no haya pasado, o no exista (registros antiguos sin
// end_date, que se asumen vigentes por no tener forma de saber lo contrario).
const esIncapacidadVigente = (endDate) => {
  if (!endDate) return true;
  const fin = new Date(endDate);
  fin.setHours(23, 59, 59, 999);
  return fin >= new Date();
};

// El backend guarda estas fechas como medianoche UTC del día real (mismo criterio que
// las citas, ver formatLongDate en utils/date.js): hay que leerlas con los getters UTC,
// no los locales, o el día se corre uno atrás en cualquier huso horario detrás de UTC
// (todo Latinoamérica) al comparar contra el filtro elegido.
const fechaComoDDMMAAAA = (iso) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};
const mismoDiaUTC = (isoDate, filtro) => !filtro || fechaComoDDMMAAAA(isoDate) === filtro;

// Lista de TODOS los documentos de un tipo (incapacidad o receta), de todas las
// consultas del paciente — a diferencia de la sección "Documentos" dentro del detalle de
// una consulta puntual, que solo muestra los de esa consulta.
export default function DocumentsListScreen({ navigation, route }) {
  const { tipo } = route.params || {};
  const info = TIPO_INFO[tipo] || TIPO_INFO.incapacidad;

  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [descargandoId, setDescargandoId] = useState(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiClient(info.endpoint)
      .then((data) => setDocumentos(Array.isArray(data) ? data : []))
      .catch((error) => showError(error.message || "No se pudieron cargar tus documentos."))
      .finally(() => setLoading(false));
  }, [info.endpoint]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const visibles = useMemo(() => {
    return [...documentos]
      .filter((d) => mismoDiaUTC(d[info.fechaCampo], filtroFecha))
      .sort((a, b) => new Date(b[info.fechaCampo]) - new Date(a[info.fechaCampo]));
  }, [documentos, filtroFecha, info.fechaCampo]);

  const handleDescargar = async (doc) => {
    setDescargandoId(doc._id);
    try {
      if (tipo === "receta") await descargarRecetaPdf(doc);
      else if (tipo === "laboratorio") await descargarOrdenLaboratorioPdf(doc);
      else if (tipo === "referencia") await descargarReferenciaPdf(doc);
      else await descargarIncapacidadPdf(doc);
    } catch (error) {
      showError(error.message || "No se pudo generar el documento.");
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{info.titulo}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <FormDateInput label="Filtrar por fecha" value={filtroFecha} onChange={setFiltroFecha} />
          </View>
          {filtroFecha ? (
            <TouchableOpacity style={styles.clearFilterButton} onPress={() => setFiltroFecha("")}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2F6BFF" style={styles.loader} />
        ) : visibles.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={info.icon} size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {documentos.length === 0 ? `Todavía no tienes ${info.titulo.toLowerCase()}` : "Sin documentos en esa fecha"}
            </Text>
            <Text style={styles.emptyText}>
              {documentos.length === 0
                ? "Aparecerán aquí cuando tu doctor los genere en una consulta."
                : "Prueba quitando el filtro o eligiendo otra fecha."}
            </Text>
          </View>
        ) : (
          visibles.map((doc) => (
            <View key={doc._id} style={styles.docCard}>
              <View style={styles.docCardTop}>
                <View>
                  <View style={styles.docCardDateRow}>
                    <Text style={styles.docCardDate}>{formatLongDate(doc[info.fechaCampo])}</Text>
                    {tipo === "incapacidad" && (
                      <View style={[styles.vigenteBadge, { backgroundColor: esIncapacidadVigente(doc.end_date) ? "#E6F7EE" : "#F1F5F9" }]}>
                        <Text style={[styles.vigenteBadgeText, { color: esIncapacidadVigente(doc.end_date) ? "#16A34A" : "#64748B" }]}>
                          {esIncapacidadVigente(doc.end_date) ? "Vigente" : "No vigente"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.docCardDoctor}>{nombreDoctor(doc.doctor_id || doc.doctor)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.downloadPill}
                  disabled={descargandoId === doc._id}
                  onPress={() => handleDescargar(doc)}
                >
                  {descargandoId === doc._id ? (
                    <ActivityIndicator size="small" color="#2F6BFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={13} color="#2F6BFF" />
                      <Text style={styles.downloadPillText}>Descargar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.docCardBody}>
                {tipo === "incapacidad" ? (
                  <>
                    <Text style={styles.docCardLabel}>Diagnóstico</Text>
                    <Text style={styles.docCardValue}>{doc.diagnosis || "Sin diagnóstico registrado"}</Text>
                  </>
                ) : tipo === "laboratorio" ? (
                  <>
                    <Text style={styles.docCardLabel}>Exámenes solicitados</Text>
                    <Text style={styles.docCardValue}>
                      {(() => {
                        const n = countSelectedTests(doc.tests);
                        return n === 1 ? "1 examen solicitado" : `${n} exámenes solicitados`;
                      })()}
                    </Text>
                  </>
                ) : tipo === "referencia" ? (
                  <>
                    <Text style={styles.docCardLabel}>Motivo</Text>
                    <Text style={styles.docCardValue}>{doc.reason || "Sin motivo registrado"}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.docCardLabel}>Medicamentos</Text>
                    <Text style={styles.docCardValue}>
                      {(doc.medications || []).map((m) => m.name).filter(Boolean).join(", ") || "Sin medicamentos registrados"}
                    </Text>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
