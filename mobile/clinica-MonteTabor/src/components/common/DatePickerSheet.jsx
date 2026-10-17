import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/common/datePickerSheetStyle";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
// La semana empieza en lunes, como el calendario de El Salvador.
const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
// Alto fijo de cada fila de la vista de años, para poder desplazarse
// directo al año seleccionado al abrirla.
const YEAR_ROW_HEIGHT = 52;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Ajusta una fecha para que quede dentro del rango permitido.
const clamp = (date, min, max) => {
  if (date > max) return new Date(max);
  if (date < min) return new Date(min);
  return date;
};

// Construye una fecha con el año y mes dados, conservando el día cuando existe
// en ese mes (31 de marzo pasa a 30 de abril, no a 1 de mayo).
const withYearMonth = (date, year, month) =>
  new Date(year, month, Math.min(date.getDate(), daysInMonth(year, month)));

const longLabel = (date) => `${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;

/**
 * Hoja inferior para elegir una fecha con tres vistas:
 *  - Día: calendario del mes, con flechas de mes y saltos de una semana.
 *  - Mes: los 12 meses del año mostrado, con flechas de año.
 *  - Año: lista de años para saltar directo, sin recorrer mes por mes.
 * Las fechas fuera de [minimumDate, maximumDate] se ven bloqueadas y no se
 * pueden elegir (por ejemplo, una fecha de nacimiento posterior a hoy).
 */
export default function DatePickerSheet({
  visible,
  title,
  value,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(),
  onCancel,
  onConfirm,
}) {
  const min = useMemo(() => startOfDay(minimumDate), [minimumDate]);
  const max = useMemo(() => startOfDay(maximumDate), [maximumDate]);
  const today = startOfDay(new Date());

  const [selected, setSelected] = useState(() => clamp(startOfDay(value || max), min, max));
  // Mes que se está mostrando en la vista de día (puede no ser el del día elegido).
  const [shown, setShown] = useState({ year: selected.getFullYear(), month: selected.getMonth() });
  const [mode, setMode] = useState("day");
  const yearsRef = useRef(null);

  // Al abrir, parte siempre del valor actual del campo.
  useEffect(() => {
    if (!visible) return;
    const initial = clamp(startOfDay(value || max), min, max);
    setSelected(initial);
    setShown({ year: initial.getFullYear(), month: initial.getMonth() });
    setMode("day");
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (date) => {
    const next = clamp(date, min, max);
    setSelected(next);
    setShown({ year: next.getFullYear(), month: next.getMonth() });
  };

  const isMonthDisabled = (year, month) =>
    new Date(year, month + 1, 0) < min || new Date(year, month, 1) > max;

  const moveMonth = (delta) => {
    const target = new Date(shown.year, shown.month + delta, 1);
    setShown({ year: target.getFullYear(), month: target.getMonth() });
  };

  const moveWeek = (delta) => {
    const next = new Date(selected);
    next.setDate(next.getDate() + delta * 7);
    select(next);
  };

  const pickMonth = (month) => {
    if (isMonthDisabled(shown.year, month)) return;
    select(withYearMonth(selected, shown.year, month));
    setMode("day");
  };

  const pickYear = (year) => {
    // Al cambiar de año se conserva el mes; si ese mes queda fuera del rango
    // (ej. diciembre del año actual), clamp lo lleva al último día permitido.
    select(withYearMonth(selected, year, selected.getMonth()));
    setShown({ year, month: selected.getMonth() });
    setMode("month");
  };

  // Celdas del calendario del mes mostrado, con huecos al inicio para alinear
  // el primer día con su día de la semana (lunes primero).
  const dayCells = useMemo(() => {
    const first = new Date(shown.year, shown.month, 1);
    const offset = (first.getDay() + 6) % 7;
    const cells = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth(shown.year, shown.month); d++) {
      cells.push(new Date(shown.year, shown.month, d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [shown]);

  const years = useMemo(() => {
    const list = [];
    for (let y = max.getFullYear(); y >= min.getFullYear(); y--) list.push(y);
    return list;
  }, [min, max]);

  // Al abrir la vista de años, se desplaza hasta el año elegido.
  useEffect(() => {
    if (mode !== "year") return;
    const index = years.indexOf(selected.getFullYear());
    const row = Math.floor(Math.max(index, 0) / 4);
    setTimeout(() => yearsRef.current?.scrollTo({ y: Math.max(row - 1, 0) * YEAR_ROW_HEIGHT, animated: false }), 0);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Indica si el mes a delta meses del mostrado tiene algún día permitido.
  const canMoveMonth = (delta) => {
    const target = new Date(shown.year, shown.month + delta, 1);
    return !isMonthDisabled(target.getFullYear(), target.getMonth());
  };
  const canPrevMonth = canMoveMonth(-1);
  const canNextMonth = canMoveMonth(1);
  const canPrevYear = shown.year - 1 >= min.getFullYear();
  const canNextYear = shown.year + 1 <= max.getFullYear();

  const renderTabs = () => (
    <View style={styles.tabs}>
      {[["day", "Día"], ["month", "Mes"], ["year", "Año"]].map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, mode === key && styles.tabActive]}
          onPress={() => setMode(key)}
        >
          <Text style={[styles.tabText, mode === key && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDayView = () => (
    <>
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navButton, !canPrevMonth && styles.navButtonDisabled]} onPress={() => moveMonth(-1)} disabled={!canPrevMonth}>
          <Ionicons name="chevron-back" size={18} color="#2F6BFF" />
        </TouchableOpacity>
        <View style={styles.navTitleRow}>
          <TouchableOpacity onPress={() => setMode("month")}>
            <Text style={styles.navTitle}>{MONTHS[shown.month]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("year")}>
            <Text style={[styles.navTitle, styles.navTitleYear]}>{shown.year}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.navButton, !canNextMonth && styles.navButtonDisabled]} onPress={() => moveMonth(1)} disabled={!canNextMonth}>
          <Ionicons name="chevron-forward" size={18} color="#2F6BFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => <Text key={i} style={styles.weekDay}>{d}</Text>)}
      </View>

      <View style={styles.daysGrid}>
        {dayCells.map((date, i) => {
          if (!date) return <View key={i} style={styles.dayCell} />;
          const disabled = date < min || date > max;
          const isSelected = sameDay(date, selected);
          const isToday = sameDay(date, today);
          return (
            <TouchableOpacity key={i} style={styles.dayCell} disabled={disabled} onPress={() => select(date)}>
              <View style={[styles.dayCircle, isToday && styles.dayToday, isSelected && styles.daySelected]}>
                <Text style={[styles.dayText, disabled && styles.dayTextDisabled, isSelected && styles.dayTextSelected]}>
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickChip} onPress={() => moveWeek(-1)}>
          <Ionicons name="play-back" size={12} color="#2F6BFF" />
          <Text style={styles.quickText}>1 semana</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickChip, styles.quickChipToday]} onPress={() => select(today)}>
          <Text style={[styles.quickText, styles.quickTextToday]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickChip} onPress={() => moveWeek(1)}>
          <Text style={styles.quickText}>1 semana</Text>
          <Ionicons name="play-forward" size={12} color="#2F6BFF" />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderMonthView = () => (
    <>
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navButton, !canPrevYear && styles.navButtonDisabled]} disabled={!canPrevYear} onPress={() => setShown((s) => ({ ...s, year: s.year - 1 }))}>
          <Ionicons name="chevron-back" size={18} color="#2F6BFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode("year")}>
          <Text style={[styles.navTitle, styles.navTitleYear]}>{shown.year}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, !canNextYear && styles.navButtonDisabled]} disabled={!canNextYear} onPress={() => setShown((s) => ({ ...s, year: s.year + 1 }))}>
          <Ionicons name="chevron-forward" size={18} color="#2F6BFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {MONTHS_SHORT.map((label, month) => {
          const disabled = isMonthDisabled(shown.year, month);
          const isSelected = selected.getFullYear() === shown.year && selected.getMonth() === month;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.gridCell, isSelected && styles.gridCellSelected, disabled && styles.gridCellDisabled]}
              disabled={disabled}
              onPress={() => pickMonth(month)}
            >
              <Text style={[styles.gridText, isSelected && styles.gridTextSelected, disabled && styles.dayTextDisabled]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderYearView = () => (
    <ScrollView ref={yearsRef} style={styles.yearsScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {years.map((year) => {
          const isSelected = selected.getFullYear() === year;
          return (
            <TouchableOpacity
              key={year}
              style={[styles.gridCell, styles.yearCell, isSelected && styles.gridCellSelected]}
              onPress={() => pickYear(year)}
            >
              <Text style={[styles.gridText, isSelected && styles.gridTextSelected]}>{year}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}><Text style={styles.cancel}>Cancelar</Text></TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={() => onConfirm(selected)}><Text style={styles.done}>Listo</Text></TouchableOpacity>
          </View>

          <View style={styles.summary}>
            <Ionicons name="calendar" size={18} color="#2F6BFF" />
            <Text style={styles.summaryText}>{longLabel(selected)}</Text>
          </View>

          {renderTabs()}
          <View style={styles.body}>
            {mode === "day" && renderDayView()}
            {mode === "month" && renderMonthView()}
            {mode === "year" && renderYearView()}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
