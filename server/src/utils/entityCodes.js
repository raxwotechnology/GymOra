function normalizeObjectIdFragment(value) {
  const compact = String(value || "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  return compact.slice(-6).padStart(6, "0");
}

function buildCoachCode(id) {
  return `COA-${normalizeObjectIdFragment(id)}`;
}

function buildMemberCode(id) {
  return `MEM-${normalizeObjectIdFragment(id)}`;
}

module.exports = {
  buildCoachCode,
  buildMemberCode
};
