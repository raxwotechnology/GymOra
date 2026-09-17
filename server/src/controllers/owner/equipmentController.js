const Equipment = require("../../models/Equipment");
const Expense = require("../../models/Expense");
const { canManageGym, findOwnedDocument, parseDateOrNull } = require("./ownerUtils");

async function serviceEquipment(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") return res.status(403).json({ message: "You do not have access to this equipment" });
  if (!equipment) return res.status(404).json({ message: "Equipment not found" });

  const { type = "service", description = "", cost = 0, technician = "" } = req.body || {};

  const servicedAt = new Date();
  const serviceEntry = {
    date: servicedAt,
    type,
    description,
    cost: Number(cost) || 0,
    technician,
    linkedExpenseId: null
  };

  // Auto-create expense if there is a cost
  if (Number(cost) > 0) {
    const expense = await Expense.create({
      gym: equipment.gym,
      type: "expense",
      sourceType: "equipment",
      title: `${equipment.name} – ${type}`,
      category: "Equipment Service",
      amount: Number(cost),
      status: "paid",
      vendor: technician || "",
      paymentMethod: "cash",
      expenseDate: servicedAt
    });
    serviceEntry.linkedExpenseId = expense._id;
  }

  equipment.serviceHistory.push(serviceEntry);
  equipment.status = "good";
  equipment.lastService = servicedAt;
  equipment.nextServiceDate = new Date(servicedAt.getFullYear(), servicedAt.getMonth() + 3, servicedAt.getDate());
  await equipment.save();

  return res.json({ message: "Equipment serviced", equipment });
}

async function createEquipment(req, res) {
  const { gymId, name, qty, status, nextServiceDate, purchaseDate, purchasePrice, vendor, serialNumber, location, warrantyExpiresAt } = req.body || {};

  if (!gymId || !name || !qty || !status) {
    return res.status(400).json({ message: "gymId, name, qty, and status are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const lastService = new Date();
  const parsedNextServiceDate = parseDateOrNull(nextServiceDate) || new Date(lastService.getFullYear(), lastService.getMonth() + 3, lastService.getDate());

  const equipment = await Equipment.create({
    gym: gymId,
    name,
    qty: Number(qty),
    status,
    lastService,
    nextServiceDate: parsedNextServiceDate,
    purchaseDate: parseDateOrNull(purchaseDate),
    purchasePrice: Number(purchasePrice) || 0,
    vendor: vendor || "",
    serialNumber: serialNumber || "",
    location: location || "",
    warrantyExpiresAt: parseDateOrNull(warrantyExpiresAt)
  });

  return res.status(201).json({ id: equipment._id });
}

async function updateEquipment(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") return res.status(403).json({ message: "You do not have access to this equipment" });
  if (!equipment) return res.status(404).json({ message: "Equipment not found" });

  const { name, qty, status, nextServiceDate, purchaseDate, purchasePrice, vendor, serialNumber, location, warrantyExpiresAt } = req.body || {};

  if (name) equipment.name = name;
  if (qty != null) equipment.qty = Number(qty);
  if (status) equipment.status = status;
  if (nextServiceDate !== undefined) equipment.nextServiceDate = parseDateOrNull(nextServiceDate) || equipment.nextServiceDate;
  if (purchaseDate !== undefined) equipment.purchaseDate = parseDateOrNull(purchaseDate);
  if (purchasePrice !== undefined) equipment.purchasePrice = Number(purchasePrice) || 0;
  if (vendor !== undefined) equipment.vendor = vendor;
  if (serialNumber !== undefined) equipment.serialNumber = serialNumber;
  if (location !== undefined) equipment.location = location;
  if (warrantyExpiresAt !== undefined) equipment.warrantyExpiresAt = parseDateOrNull(warrantyExpiresAt);

  await equipment.save();
  return res.json({ message: "Equipment updated" });
}

async function reportBreakage(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") return res.status(403).json({ message: "Access denied" });
  if (!equipment) return res.status(404).json({ message: "Equipment not found" });

  const { description = "", reportedBy = "" } = req.body || {};

  const entry = { reportedAt: new Date(), description, reportedBy, resolvedAt: null, resolutionNotes: "" };
  equipment.breakageHistory.push(entry);
  equipment.status = "maintenance";
  await equipment.save();

  return res.status(201).json({ message: "Breakage reported", equipment });
}

async function resolveBreakage(req, res) {
  const equipment = await findOwnedDocument(Equipment, req, req.params.id);
  if (equipment === "forbidden") return res.status(403).json({ message: "Access denied" });
  if (!equipment) return res.status(404).json({ message: "Equipment not found" });

  const entry = equipment.breakageHistory.id(req.params.bid);
  if (!entry) return res.status(404).json({ message: "Breakage entry not found" });

  const { resolutionNotes = "" } = req.body || {};
  entry.resolvedAt = new Date();
  entry.resolutionNotes = resolutionNotes;

  const hasUnresolved = equipment.breakageHistory.some((b) => !b.resolvedAt);
  if (!hasUnresolved) equipment.status = "good";

  await equipment.save();
  return res.json({ message: "Breakage resolved", equipment });
}

module.exports = { serviceEquipment, createEquipment, updateEquipment, reportBreakage, resolveBreakage };
