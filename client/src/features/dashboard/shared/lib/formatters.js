import { AUDIT_LABEL_OVERRIDES, EXPENSE_CATEGORY_OPTIONS, PAGE_SIZE } from "./constants";

export function formatAuditFieldLabel(key) {
  if (!key) {
    return "Details";
  }

  if (AUDIT_LABEL_OVERRIDES[key]) {
    return AUDIT_LABEL_OVERRIDES[key];
  }

  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatAuditValue(value, key = "") {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "None";
    }

    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return value.join(", ");
    }

    if (key === "meals") {
      return value
        .map((meal) => {
          if (!meal || typeof meal !== "object") {
            return null;
          }
          const mealLabel = meal.name || meal.time || "Meal";
          const foods = Array.isArray(meal.foods) && meal.foods.length ? ` (${meal.foods.join(", ")})` : "";
          return `${mealLabel}${foods}`;
        })
        .filter(Boolean)
        .join("; ");
    }

    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (typeof value === "object") {
    if (value.name) {
      const secondaryKey = ["goal", "day", "time", "level", "week"].find((candidate) => value[candidate]);
      if (secondaryKey) {
        return `${value.name} (${formatAuditFieldLabel(secondaryKey)}: ${value[secondaryKey]})`;
      }
      return value.name;
    }

    const compactEntries = Object.entries(value)
      .filter(([, nestedValue]) => typeof nestedValue !== "object" || nestedValue === null)
      .slice(0, 3)
      .map(([nestedKey, nestedValue]) => `${formatAuditFieldLabel(nestedKey)}: ${nestedValue}`);

    return compactEntries.length ? compactEntries.join(" | ") : "Structured details saved";
  }

  return String(value);
}

export function buildAuditFields(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return [];
  }

  return Object.entries(snapshot)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: formatAuditFieldLabel(key),
      value: formatAuditValue(value, key)
    }));
}

export function sanitizeFilePart(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";
}

export function formatCurrencyValue(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

export function normalizePaymentNumber(value, fallback = 0) {
  if (value == null || value === "") {
    return Number(fallback || 0);
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : Number(fallback || 0);
}

export function deriveSubscriptionPaymentStatus(amountPaid, amountDue) {
  const paid = normalizePaymentNumber(amountPaid);
  const due = normalizePaymentNumber(amountDue);

  if (due <= 0 || paid >= due) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "unpaid";
}

export function calculateRemainingBalance(amountPaid, amountDue) {
  const paid = normalizePaymentNumber(amountPaid);
  const due = normalizePaymentNumber(amountDue);
  return Math.max(0, due - paid);
}

export function matchesQuery(item, query, fields) {
  if (!query.trim()) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  return fields.some((field) => String(item[field] || "").toLowerCase().includes(normalized));
}

export function getExpenseCategories(type = "expense", items = []) {
  const normalizedType = type === "income" ? "income" : type === "all" ? "all" : "expense";
  const baseOptions = normalizedType === "all"
    ? [...EXPENSE_CATEGORY_OPTIONS.expense, ...EXPENSE_CATEGORY_OPTIONS.income]
    : EXPENSE_CATEGORY_OPTIONS[normalizedType] || [];
  const existingOptions = items
    .filter((item) => normalizedType === "all" || (item.type || "expense") === normalizedType)
    .map((item) => String(item.category || "").trim())
    .filter(Boolean);

  return Array.from(new Set([...baseOptions, ...existingOptions]));
}

export function paginateItems(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    totalPages,
    visibleItems: items.slice(start, start + pageSize)
  };
}

export function lastMetricValue(values, suffix = "") {
  if (!Array.isArray(values) || values.length === 0) {
    return `0${suffix}`;
  }

  const last = values[values.length - 1];
  return `${last ?? 0}${suffix}`;
}

export function metricDelta(values) {
  if (!Array.isArray(values) || values.length < 2) {
    return 0;
  }

  return Number(values[values.length - 1] || 0) - Number(values[0] || 0);
}

export function metricValue(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return Number(values[values.length - 1] || 0);
}

export function targetProgress(current, target, goalType = "down") {
  if (current == null || target == null || !Number.isFinite(Number(current)) || !Number.isFinite(Number(target))) {
    return 0;
  }

  const currentValue = Number(current);
  const targetValue = Number(target);

  if (goalType === "up") {
    if (targetValue <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, (currentValue / targetValue) * 100));
  }

  if (currentValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((currentValue - targetValue) / currentValue) * 100));
}

export function toPlanFeatures(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}

export function toMealLines(value) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((meal) => [meal.time || "", meal.name || "", Array.isArray(meal.foods) ? meal.foods.join(", ") : ""].join(" | "))
    .join("\n");
}

export function toMealEntries(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ time: "", name: "", foods: "" }];
  }

  return value.map((meal) => ({
    time: meal.time || "",
    name: meal.name || "",
    foods: Array.isArray(meal.foods) ? meal.foods.join(", ") : ""
  }));
}

export function formatReceiptDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-LK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function buildReceiptNumber(id) {
  const safeId = String(id || "").trim();
  if (!safeId) {
    return "SALE";
  }

  return `SALE-${safeId.slice(-6).toUpperCase()}`;
}

export function getReceiptDisplayDetails(receipt) {
  const customerName = String(receipt?.customerName || "").trim();
  const memberName = String(receipt?.memberName || "").trim();
  const normalizedCustomer = customerName.toLowerCase();
  const normalizedMember = memberName.toLowerCase();
  const hasDistinctMember = Boolean(memberName && normalizedMember !== normalizedCustomer);

  return {
    buyerName: customerName || memberName || "Walk-in Customer",
    memberName,
    hasDistinctMember
  };
}

export function getReceiptEmailMessage(receiptEmail) {
  if (!receiptEmail || receiptEmail.status === "not-requested") {
    return "";
  }

  if (receiptEmail.status === "sent") {
    return `Receipt emailed to ${receiptEmail.to}.`;
  }

  if (receiptEmail.status === "skipped") {
    return "Receipt email was skipped because SMTP is not configured on the server.";
  }

  if (receiptEmail.status === "failed") {
    return `Receipt email could not be sent to ${receiptEmail.to}.`;
  }

  return "";
}

export function escapeReceiptHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function RevenueBreakdown({ members, plans }) {
  const safeMembers = Array.isArray(members) ? members : [];
  const safePlans = Array.isArray(plans) ? plans : [];

  const totalRevenue = safeMembers.reduce((sum, member) => {
    const plan = safePlans.find((item) => item.name === member.plan);
    return sum + (plan?.price || 0);
  }, 0);

  return safePlans.map((plan) => {
    const count = safeMembers.filter((member) => member.plan === plan.name).length;
    const value = count * plan.price;
    return { ...plan, count, value, percent: totalRevenue ? (value / totalRevenue) * 100 : 0 };
  });
}
