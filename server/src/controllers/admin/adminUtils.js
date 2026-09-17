function formatDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

function formatDateTime(date) {
  return date ? new Date(date).toISOString() : "";
}

function buildGymPayload(body = {}) {
  const payload = {};
  const fields = ["name", "location", "phone", "website", "facebookUrl", "googleMapsUrl", "brNumber", "description"];
  for (const f of fields) {
    if (body[f] !== undefined) payload[f] = body[f];
  }
  if (body.owner !== undefined) payload.ownerName = body.owner;
  if (body.email !== undefined) payload.ownerEmail = body.email.toLowerCase().trim();
  if (body.plan !== undefined) payload.plan = body.plan;
  if (body.status !== undefined) payload.status = body.status;
  return payload;
}

module.exports = { formatDate, formatDateTime, buildGymPayload };
