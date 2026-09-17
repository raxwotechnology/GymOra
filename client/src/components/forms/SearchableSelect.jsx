import React from "react";

const fieldStyle = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "13px 15px",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.03)",
  transition: "border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8
};

const MAX_VISIBLE_OPTIONS = 50;

/**
 * Drop-in, search-as-you-type replacement for <Select>. Accepts either plain string
 * options or {value, label} objects. Filters locally (case-insensitive substring) and
 * caps the rendered list so very long collections (members, products, ...) stay snappy.
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Search…",
  emptyOption,
  allowClear = false,
  getOptionLabel,
  getOptionValue,
  disabled = false,
  style
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const normalized = React.useMemo(() => {
    const toEntry = (opt) => {
      if (opt && typeof opt === "object") {
        return {
          value: getOptionValue ? getOptionValue(opt) : opt.value,
          label: getOptionLabel ? getOptionLabel(opt) : (opt.label ?? String(opt.value ?? ""))
        };
      }
      return { value: opt, label: String(opt) };
    };
    const list = options.map(toEntry);
    return emptyOption ? [toEntry(emptyOption), ...list] : list;
  }, [options, emptyOption, getOptionLabel, getOptionValue]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? normalized.filter((o) => o.label.toLowerCase().includes(q)) : normalized;
    return matches.slice(0, MAX_VISIBLE_OPTIONS);
  }, [normalized, query]);

  const overflowCount = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const total = q ? normalized.filter((o) => o.label.toLowerCase().includes(q)).length : normalized.length;
    return Math.max(0, total - filtered.length);
  }, [normalized, query, filtered]);

  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(""); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = normalized.find((o) => String(o.value) === String(value));
  const displayLabel = selected ? selected.label : (placeholder || "Select…");

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div
        style={{ ...fieldStyle, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ flex: 1, color: selected ? "var(--text)" : "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {displayLabel}
        </span>
        {allowClear && selected && String(selected.value) !== "" && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); }}
            style={{ color: "var(--muted)", fontSize: 12, padding: "0 2px" }}
            title="Clear"
          >
            ✕
          </span>
        )}
        <span style={{ color: "var(--muted)", fontSize: 10 }}>&#9660;</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "#fff", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 4, padding: 8 }}>
          <input
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, marginBottom: 6, boxSizing: "border-box", outline: "none" }}
          />
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>No matches</div>
            )}
            {filtered.map((opt) => (
              <div
                key={String(opt.value)}
                onClick={() => { onChange(opt.value); setQuery(""); setOpen(false); }}
                style={{ padding: "8px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: String(value) === String(opt.value) ? "#eff6ff" : "transparent", color: String(value) === String(opt.value) ? "#2563eb" : "var(--text)", fontWeight: String(value) === String(opt.value) ? 700 : 400 }}
                onMouseEnter={(e) => { if (String(value) !== String(opt.value)) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (String(value) !== String(opt.value)) e.currentTarget.style.background = "transparent"; }}
              >
                {opt.label}
              </div>
            ))}
            {overflowCount > 0 && (
              <div style={{ padding: "8px 10px", fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
                +{overflowCount} more — keep typing to narrow it down
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
