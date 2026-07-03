const BADGE_STYLES = {
  green:  "bg-green-50 text-green-700 border border-green-200",
  red:    "bg-red-50 text-red-600 border border-red-200",
  orange: "bg-orange-50 text-orange-600 border border-orange-200",
  blue:   "bg-blue-50 text-blue-600 border border-blue-200",
  purple: "bg-purple-50 text-purple-600 border border-purple-200",
  gray:   "bg-slate-50 text-slate-500 border border-slate-200",
};

const StatusBadge = ({ label, color = "gray" }) => (
  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[color] || BADGE_STYLES.gray}`}>
    {label}
  </span>
);

export default StatusBadge;