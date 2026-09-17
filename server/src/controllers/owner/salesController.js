const Coach = require("../../models/Coach");
const Member = require("../../models/Member");
const Supplement = require("../../models/Supplement");
const Supplier = require("../../models/Supplier");
const Sale = require("../../models/Sale");
const SaleReturn = require("../../models/SaleReturn");
const Expense = require("../../models/Expense");
const { applyLedgerEntry, reconcileLedgerEntry, revertLedgerEntry } = require("../../services/bankLedger");

// A gym income/expense entry only moves a bank's balance when paid by bank-transfer
// with a specific bank chosen, and the entry is "paid" (not pending).
function expenseLedgerTarget(expense) {
  if (!expense || expense.status !== "paid" || expense.paymentMethod !== "bank-transfer" || !expense.bankDetail) {
    return { bankDetailId: null, signedAmount: 0 };
  }
  const signedAmount = expense.type === "income" ? Number(expense.amount || 0) : -Number(expense.amount || 0);
  return { bankDetailId: expense.bankDetail, signedAmount };
}

function deriveRestockPaymentStatus(amountPaid, totalCost) {
  if (totalCost <= 0) return "paid";
  if (amountPaid <= 0) return "unpaid";
  if (amountPaid >= totalCost) return "paid";
  return "partial";
}
const Message = require("../../models/Message");
const Gym = require("../../models/Gym");
const User = require("../../models/User");
const {
  canManageGym, findOwnedDocument, normalizeSupplementStatus,
  buildSaleReceiptEmail, formatMessageTime, avatarFromName, logCoachActivity
} = require("./ownerUtils");
const { isEmailConfigured, sendMail } = require("../../utils/email");

async function createMessage(req, res) {
  const { recipientUserId, memberId, text } = req.body || {};
  const trimmedText = String(text || "").trim();

  if (!trimmedText) {
    return res.status(400).json({ message: "Message text is required" });
  }

  if (!canManageGym(req, req.user?.gym)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  if (!["coach", "member"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Only coaches and members can send messages" });
  }

  if (req.user.role === "coach") {
    const coach = await Coach.findOne({ user: req.user._id, gym: req.user.gym });
    if (!coach) return res.status(404).json({ message: "Coach profile not found" });

    const member = memberId
      ? await Member.findOne({ _id: memberId, gym: req.user.gym })
      : await Member.findOne({ user: recipientUserId, gym: req.user.gym });

    if (!member) return res.status(404).json({ message: "Member not found" });

    if (member.coach !== coach.name) {
      return res.status(403).json({ message: "You can only message your assigned members" });
    }

    const message = await Message.create({
      gym: req.user.gym, coachName: coach.name, memberName: member.name,
      coachUser: coach.user, memberUser: member.user, from: coach.name,
      avatar: coach.avatar || avatarFromName(coach.name), senderRole: "coach",
      senderUser: req.user._id, recipientRole: "member", recipientUser: member.user,
      text: trimmedText, time: formatMessageTime(), unread: true
    });

    await logCoachActivity(req, {
      action: "message", targetType: "member", targetId: member._id, targetName: member.name,
      summary: `Sent a message to ${member.name}`,
      after: { text: trimmedText, sentAt: message.createdAt, memberName: member.name },
      metadata: { coachName: coach.name, messageId: message._id }
    });

    return res.status(201).json({ message: "Message sent" });
  }

  const member = await Member.findOne({ user: req.user._id, gym: req.user.gym });
  if (!member) return res.status(404).json({ message: "Member profile not found" });

  const coach = await Coach.findOne({ gym: req.user.gym, name: member.coach });
  if (!coach) return res.status(404).json({ message: "Assigned coach not found" });

  await Message.create({
    gym: req.user.gym, coachName: coach.name, memberName: member.name,
    coachUser: coach.user, memberUser: member.user, from: member.name,
    avatar: member.avatar || avatarFromName(member.name), senderRole: "member",
    senderUser: req.user._id, recipientRole: "coach", recipientUser: coach.user,
    text: trimmedText, time: formatMessageTime(), unread: true
  });

  return res.status(201).json({ message: "Message sent" });
}

async function markMessagesRead(req, res) {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

  if (ids.length === 0) {
    return res.status(400).json({ message: "At least one message id is required" });
  }

  await Message.updateMany(
    { _id: { $in: ids }, recipientUser: req.user._id, gym: req.user.gym },
    { $set: { unread: false, readAt: new Date() } }
  );

  return res.json({ message: "Messages marked as read" });
}

async function createExpense(req, res) {
  const { gymId, type, sourceType, title, category, amount, expenseDate, status, vendor, contactName, paymentMethod, bankDetail, referenceNumber, notes } = req.body || {};

  if (!gymId || !title || !category || amount == null || !expenseDate) {
    return res.status(400).json({ message: "gymId, title, category, amount, and expenseDate are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const expense = new Expense({
    gym: gymId, type: type === "income" ? "income" : "expense", sourceType: sourceType || "manual",
    title, category, amount: Number(amount), expenseDate: new Date(expenseDate),
    status: status || "paid", vendor: vendor || "", contactName: contactName || "",
    paymentMethod: paymentMethod || "cash", bankDetail: bankDetail || null,
    referenceNumber: referenceNumber || "", notes: notes || ""
  });
  const target = expenseLedgerTarget(expense);
  await applyLedgerEntry(expense, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await expense.save();

  return res.status(201).json({ id: expense._id });
}

async function updateExpense(req, res) {
  const expense = await findOwnedDocument(Expense, req, req.params.id);
  if (expense === "forbidden") return res.status(403).json({ message: "You do not have access to this expense" });
  if (!expense) return res.status(404).json({ message: "Expense not found" });

  const { type, sourceType, title, category, amount, expenseDate, status, vendor, contactName, paymentMethod, bankDetail, referenceNumber, notes } = req.body || {};

  if (type) expense.type = type === "income" ? "income" : "expense";
  if (sourceType != null) expense.sourceType = sourceType || "manual";
  if (title) expense.title = title;
  if (category) expense.category = category;
  if (amount != null) expense.amount = Number(amount);
  if (expenseDate) expense.expenseDate = new Date(expenseDate);
  if (status) expense.status = status;
  if (vendor != null) expense.vendor = vendor;
  if (contactName != null) expense.contactName = contactName;
  if (paymentMethod != null) expense.paymentMethod = paymentMethod;
  if (bankDetail !== undefined) expense.bankDetail = bankDetail || null;
  if (referenceNumber != null) expense.referenceNumber = referenceNumber;
  if (notes != null) expense.notes = notes;

  const target = expenseLedgerTarget(expense);
  await reconcileLedgerEntry(expense, { bankDetailId: target.bankDetailId, signedAmount: target.signedAmount });
  await expense.save();
  return res.json({ message: "Expense updated" });
}

async function createSupplement(req, res) {
  const { gymId, name, sku, brand, category, stockQty, unitPrice, buyingPrice, reorderLevel, status, imageUrl, supplierId, supplierName, sqn, grn, supplierPriceNote } = req.body || {};

  if (!gymId || !name || !sku || !category || stockQty == null || unitPrice == null) {
    return res.status(400).json({ message: "gymId, name, sku, category, stockQty, and unitPrice are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const normalizedSku = String(sku).trim().toUpperCase();
  const existingBySku = await Supplement.findOne({ gym: gymId, sku: normalizedSku }).lean();
  if (existingBySku) return res.status(400).json({ message: "A supplement with that SKU already exists" });

  // Duplicate detection: same name + same supplier + same price → top up stock
  if (supplierId) {
    const duplicate = await Supplement.findOne({
      gym: gymId,
      name: { $regex: new RegExp(`^${String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      supplierId,
      unitPrice: Number(unitPrice)
    });
    if (duplicate) {
      duplicate.stockQty += Number(stockQty);
      duplicate.status = normalizeSupplementStatus(duplicate.stockQty, duplicate.reorderLevel, duplicate.status);
      await duplicate.save();
      return res.status(200).json({ id: duplicate._id, merged: true });
    }
  }

  const qty = Number(stockQty);
  const reorder = Number(reorderLevel || 0);
  const supplement = await Supplement.create({
    gym: gymId, name, sku: normalizedSku, brand: brand || "", category,
    imageUrl: imageUrl || "",
    stockQty: qty, unitPrice: Number(unitPrice), buyingPrice: Number(buyingPrice || 0),
    reorderLevel: reorder, status: normalizeSupplementStatus(qty, reorder, status),
    supplierId: supplierId || null, supplierName: supplierName || "",
    sqn: sqn || "", grn: grn || "", supplierPriceNote: supplierPriceNote || ""
  });

  return res.status(201).json({ id: supplement._id, merged: false });
}

async function updateSupplement(req, res) {
  const supplement = await findOwnedDocument(Supplement, req, req.params.id);
  if (supplement === "forbidden") return res.status(403).json({ message: "You do not have access to this supplement" });
  if (!supplement) return res.status(404).json({ message: "Supplement not found" });

  const { name, sku, brand, category, stockQty, unitPrice, buyingPrice, reorderLevel, status, imageUrl, supplierId, supplierName, sqn, grn, supplierPriceNote } = req.body || {};

  if (name) supplement.name = name;
  if (sku) supplement.sku = String(sku).trim().toUpperCase();
  if (brand != null) supplement.brand = brand;
  if (category) supplement.category = category;
  if (imageUrl != null) supplement.imageUrl = imageUrl;
  if (stockQty != null) supplement.stockQty = Number(stockQty);
  if (unitPrice != null) supplement.unitPrice = Number(unitPrice);
  if (buyingPrice != null) supplement.buyingPrice = Number(buyingPrice);
  if (reorderLevel != null) supplement.reorderLevel = Number(reorderLevel);
  if (supplierId !== undefined) supplement.supplierId = supplierId || null;
  if (supplierName != null) supplement.supplierName = supplierName;
  if (sqn != null) supplement.sqn = sqn;
  if (grn != null) supplement.grn = grn;
  if (supplierPriceNote != null) supplement.supplierPriceNote = supplierPriceNote;
  supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel, status);

  await supplement.save();
  return res.json({ message: "Supplement updated" });
}

async function listSuppliers(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });
  const suppliers = await Supplier.find({ gym: gymId }).lean();
  return res.json(suppliers);
}

async function createSupplier(req, res) {
  const gymId = req.user?.gym;
  if (!gymId) return res.status(403).json({ message: "No gym associated with this account" });

  const { name, contactName, phone, email, address, website, notes, paymentTerms, isActive, rating, ratingNotes } = req.body || {};
  if (!name) return res.status(400).json({ message: "Supplier name is required" });

  const supplier = await Supplier.create({
    gym: gymId, name, contactName: contactName || "", phone: phone || "",
    email: email || "", address: address || "", website: website || "", notes: notes || "",
    paymentTerms: paymentTerms || "", isActive: isActive !== false,
    rating: rating ? Number(rating) : null, ratingNotes: ratingNotes || ""
  });

  return res.status(201).json({ id: supplier._id });
}

async function updateSupplier(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const { name, contactName, phone, email, address, website, notes, paymentTerms, isActive, rating, ratingNotes } = req.body || {};
  if (name) supplier.name = name;
  if (contactName != null) supplier.contactName = contactName;
  if (phone != null) supplier.phone = phone;
  if (email != null) supplier.email = email;
  if (address != null) supplier.address = address;
  if (website != null) supplier.website = website;
  if (notes != null) supplier.notes = notes;
  if (paymentTerms != null) supplier.paymentTerms = paymentTerms;
  if (isActive != null) supplier.isActive = Boolean(isActive);
  if (rating != null) supplier.rating = Number(rating);
  if (ratingNotes != null) supplier.ratingNotes = ratingNotes;

  await supplier.save();
  return res.json({ message: "Supplier updated" });
}

async function deleteSupplier(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOneAndDelete({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });
  return res.json({ message: "Supplier deleted" });
}

async function addSupplierProduct(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const { supplementId, supplementName, supplierPrice, notes } = req.body || {};
  supplier.products.push({
    supplementId: supplementId || null, supplementName: supplementName || "",
    supplierPrice: Number(supplierPrice || 0), lastUpdated: new Date(), notes: notes || ""
  });

  await supplier.save();
  return res.status(201).json({ message: "Product added" });
}

async function updateSupplierProduct(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const product = supplier.products.id(req.params.pid);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { supplementId, supplementName, supplierPrice, notes } = req.body || {};
  if (supplementId != null) product.supplementId = supplementId || null;
  if (supplementName != null) product.supplementName = supplementName;
  if (supplierPrice != null) product.supplierPrice = Number(supplierPrice);
  if (notes != null) product.notes = notes;
  product.lastUpdated = new Date();

  await supplier.save();
  return res.json({ message: "Product updated" });
}

async function removeSupplierProduct(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  supplier.products = supplier.products.filter((p) => String(p._id) !== String(req.params.pid));
  await supplier.save();
  return res.json({ message: "Product removed" });
}

async function addRestockRecord(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const {
    supplementId, supplementName, qty, unitCost, orderedAt, receivedAt, status, invoiceNumber, notes,
    paymentType, dueDate, paymentMethod, bankDetail, paymentReference, paymentNotes
  } = req.body || {};
  if (!supplementName || qty == null || unitCost == null) {
    return res.status(400).json({ message: "supplementName, qty, and unitCost are required" });
  }

  const totalCost = Number(qty) * Number(unitCost);
  const isCredit = paymentType === "credit";

  const record = {
    supplementId: supplementId || null, supplementName,
    qty: Number(qty), unitCost: Number(unitCost), totalCost,
    orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
    receivedAt: receivedAt ? new Date(receivedAt) : null,
    status: status || "ordered", invoiceNumber: invoiceNumber || "", notes: notes || "",
    paymentType: isCredit ? "credit" : "cash",
    dueDate: isCredit && dueDate ? new Date(dueDate) : null,
    amountPaid: 0,
    paymentStatus: isCredit ? "unpaid" : "paid",
    payments: []
  };

  if (!isCredit && totalCost > 0) {
    const method = paymentMethod || "cash";
    const payment = {
      amount: totalCost, paidAt: new Date(), method,
      bankDetail: method === "bank-transfer" ? (bankDetail || null) : null,
      reference: paymentReference || "", notes: paymentNotes || ""
    };
    if (method === "bank-transfer" && payment.bankDetail) {
      await applyLedgerEntry(payment, { bankDetailId: payment.bankDetail, signedAmount: -totalCost });
    }
    record.payments.push(payment);
    record.amountPaid = totalCost;
    record.paymentStatus = "paid";
  }

  supplier.restockLog.push(record);

  await supplier.save();
  return res.status(201).json({ message: "Restock record added" });
}

async function recordRestockPayment(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const record = supplier.restockLog.id(req.params.rid);
  if (!record) return res.status(404).json({ message: "Restock record not found" });

  const { amount, method, bankDetail, paidAt, reference, notes } = req.body || {};
  const amountNum = Number(amount);
  const remaining = Number(record.totalCost || 0) - Number(record.amountPaid || 0);
  if (!amountNum || amountNum <= 0) {
    return res.status(400).json({ message: "A positive payment amount is required" });
  }
  if (amountNum > remaining + 0.01) {
    return res.status(400).json({ message: `Payment exceeds remaining balance of LKR ${remaining.toLocaleString()}` });
  }

  const paymentMethod = method || "cash";
  const payment = {
    amount: amountNum, paidAt: paidAt ? new Date(paidAt) : new Date(), method: paymentMethod,
    bankDetail: paymentMethod === "bank-transfer" ? (bankDetail || null) : null,
    reference: reference || "", notes: notes || ""
  };
  if (paymentMethod === "bank-transfer" && payment.bankDetail) {
    await applyLedgerEntry(payment, { bankDetailId: payment.bankDetail, signedAmount: -amountNum });
  }

  record.payments.push(payment);
  record.amountPaid = Number(record.amountPaid || 0) + amountNum;
  record.paymentStatus = deriveRestockPaymentStatus(record.amountPaid, record.totalCost);

  await supplier.save();
  return res.status(201).json({ message: "Payment recorded" });
}

async function updateRestockRecord(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const record = supplier.restockLog.id(req.params.rid);
  if (!record) return res.status(404).json({ message: "Restock record not found" });

  const { qty, unitCost, orderedAt, receivedAt, status, invoiceNumber, notes, supplementName } = req.body || {};
  if (supplementName != null) record.supplementName = supplementName;
  if (qty != null) record.qty = Number(qty);
  if (unitCost != null) record.unitCost = Number(unitCost);
  if (qty != null || unitCost != null) record.totalCost = record.qty * record.unitCost;
  if (orderedAt != null) record.orderedAt = new Date(orderedAt);
  if (receivedAt != null) record.receivedAt = new Date(receivedAt);
  if (status != null) record.status = status;
  if (invoiceNumber != null) record.invoiceNumber = invoiceNumber;
  if (notes != null) record.notes = notes;

  await supplier.save();
  return res.json({ message: "Restock record updated" });
}

async function deleteRestockRecord(req, res) {
  const gymId = req.user?.gym;
  const supplier = await Supplier.findOne({ _id: req.params.id, gym: gymId });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });

  const record = supplier.restockLog.id(req.params.rid);
  if (record) {
    for (const payment of record.payments || []) {
      await revertLedgerEntry(payment);
    }
  }

  supplier.restockLog = supplier.restockLog.filter((r) => String(r._id) !== String(req.params.rid));
  await supplier.save();
  return res.json({ message: "Restock record deleted" });
}

async function createSale(req, res) {
  const { gymId, customerName, memberId, memberName, paymentMethod, bankDetail, notes, items } = req.body || {};

  if (!gymId || !customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "gymId, customerName, and at least one item are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const saleItems = [];
  let subtotal = 0;
  let linkedMember = null;
  let linkedMemberEmail = "";

  if (memberId) {
    linkedMember = await Member.findById(memberId).lean();
    if (!linkedMember || String(linkedMember.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Selected member not found for this gym" });
    }

    if (linkedMember.user) {
      const linkedUser = await User.findById(linkedMember.user).select("email").lean();
      linkedMemberEmail = linkedUser?.email || "";
    }
  }

  for (const item of items) {
    const supplement = await Supplement.findById(item.supplementId);
    if (!supplement || String(supplement.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Supplement not found for sale item" });
    }

    const qty = Number(item.qty || 0);
    if (qty <= 0) return res.status(400).json({ message: "Sale quantities must be greater than zero" });
    if (supplement.stockQty < qty) return res.status(400).json({ message: `${supplement.name} does not have enough stock` });

    const lineTotal = qty * supplement.unitPrice;
    subtotal += lineTotal;
    saleItems.push({
      supplement: supplement._id, name: supplement.name,
      qty, unitPrice: supplement.unitPrice, lineTotal
    });

    supplement.stockQty -= qty;
    supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel);
    await supplement.save();
  }

  const resolvedMemberName = linkedMember?.name || memberName || "";
  const resolvedPaymentMethod = paymentMethod || "cash";
  const sale = new Sale({
    gym: gymId, customerName, memberName: resolvedMemberName,
    paymentMethod: resolvedPaymentMethod, notes: notes || "",
    items: saleItems, subtotal, total: subtotal, status: "paid", soldAt: new Date(),
    bankDetail: resolvedPaymentMethod === "bank-transfer" ? (bankDetail || null) : null
  });
  if (resolvedPaymentMethod === "bank-transfer" && bankDetail) {
    await applyLedgerEntry(sale, { bankDetailId: bankDetail, signedAmount: subtotal });
  }
  await sale.save();

  let receiptEmail = { status: "not-requested" };
  const gym = linkedMemberEmail ? await Gym.findById(gymId).select("name").lean() : null;

  if (linkedMemberEmail) {
    if (isEmailConfigured()) {
      try {
        const emailPayload = buildSaleReceiptEmail({
          gymName: gym?.name || "FitnessHub Gym",
          sale: {
            id: sale._id, customerName: sale.customerName, memberName: sale.memberName,
            paymentMethod: sale.paymentMethod, notes: sale.notes,
            subtotal: sale.subtotal, total: sale.total, soldAt: sale.soldAt,
            items: sale.items.map((item) => ({
              name: item.name, qty: item.qty, unitPrice: item.unitPrice, lineTotal: item.lineTotal
            }))
          }
        });

        await sendMail({ to: linkedMemberEmail, subject: emailPayload.subject, html: emailPayload.html, text: emailPayload.text });
        receiptEmail = { status: "sent", to: linkedMemberEmail };
      } catch (error) {
        console.error("[email] Failed to send sale receipt", error);
        receiptEmail = { status: "failed", to: linkedMemberEmail };
      }
    } else {
      receiptEmail = { status: "skipped", reason: "email-not-configured", to: linkedMemberEmail };
    }
  }

  return res.status(201).json({
    id: sale._id, customerName: sale.customerName, memberName: sale.memberName,
    paymentMethod: sale.paymentMethod, notes: sale.notes, subtotal: sale.subtotal,
    total: sale.total, status: sale.status, soldAt: sale.soldAt,
    items: sale.items.map((item) => ({
      supplementId: item.supplement, name: item.name,
      qty: item.qty, unitPrice: item.unitPrice, lineTotal: item.lineTotal
    })),
    receiptEmail
  });
}

async function createSaleReturn(req, res) {
  const { gymId, saleId, reason, amount, items } = req.body || {};

  if (!gymId || !saleId || !reason || amount == null || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "gymId, saleId, reason, amount, and return items are required" });
  }

  if (!canManageGym(req, gymId)) {
    return res.status(403).json({ message: "You do not have access to this gym" });
  }

  const sale = await Sale.findById(saleId);
  if (!sale || String(sale.gym) !== String(gymId)) {
    return res.status(404).json({ message: "Sale not found" });
  }

  const returnItems = [];
  for (const item of items) {
    const saleItem = sale.items.find((entry) => String(entry.supplement) === String(item.supplementId));
    if (!saleItem) return res.status(400).json({ message: "Return item does not belong to the selected sale" });

    const supplement = await Supplement.findById(item.supplementId);
    if (!supplement || String(supplement.gym) !== String(gymId)) {
      return res.status(404).json({ message: "Supplement not found for return item" });
    }

    const qty = Number(item.qty || 0);
    if (qty <= 0 || qty > saleItem.qty) return res.status(400).json({ message: "Return quantity is invalid" });

    supplement.stockQty += qty;
    supplement.status = normalizeSupplementStatus(supplement.stockQty, supplement.reorderLevel);
    await supplement.save();

    returnItems.push({ supplement: supplement._id, name: supplement.name, qty });
  }

  const numericAmount = Number(amount);
  const saleReturn = new SaleReturn({
    gym: gymId, sale: sale._id, customerName: sale.customerName,
    reason, amount: numericAmount, items: returnItems, processedAt: new Date(),
    bankDetail: sale.paymentMethod === "bank-transfer" ? (sale.bankDetail || null) : null
  });
  if (sale.paymentMethod === "bank-transfer" && sale.bankDetail) {
    await applyLedgerEntry(saleReturn, { bankDetailId: sale.bankDetail, signedAmount: -numericAmount });
  }
  await saleReturn.save();

  sale.returnAmount = Number(sale.returnAmount || 0) + numericAmount;
  sale.status = sale.returnAmount >= sale.total ? "refunded" : "partial";
  await sale.save();

  return res.status(201).json({ id: saleReturn._id });
}

module.exports = {
  createMessage, markMessagesRead, createExpense, updateExpense,
  createSupplement, updateSupplement, createSale, createSaleReturn,
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  addSupplierProduct, updateSupplierProduct, removeSupplierProduct,
  addRestockRecord, updateRestockRecord, deleteRestockRecord, recordRestockPayment
};
