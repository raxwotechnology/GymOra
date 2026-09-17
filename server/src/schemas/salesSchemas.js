const { z } = require("zod");

const saleItemSchema = z.object({
  supplementId: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  qty: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
});

const createSaleSchema = z.object({
  gymId: z.string().min(1, "Gym is required"),
  customerName: z.string().min(1, "Customer name is required"),
  memberId: z.string().optional(),
  memberName: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankDetail: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
});

const returnItemSchema = z.object({
  supplementId: z.string().optional(),
  name: z.string().optional(),
  qty: z.number().int().positive().optional(),
});

const createSaleReturnSchema = z.object({
  gymId: z.string().min(1, "Gym is required"),
  saleId: z.string().min(1, "Sale ID is required"),
  reason: z.string().min(1, "Reason is required"),
  amount: z.number().positive("Amount must be positive"),
  items: z.array(returnItemSchema).min(1, "At least one return item is required"),
});

const createMessageSchema = z.object({
  recipientUserId: z.string().min(1, "Recipient is required"),
  memberId: z.string().optional(),
  text: z.string().min(1, "Message text is required"),
});

const markMessagesReadSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one message ID is required"),
});

const createExpenseSchema = z.object({
  gymId: z.string().min(1, "Gym is required"),
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number({ required_error: "Amount is required" }),
  expenseDate: z.string().min(1, "Expense date is required"),
  type: z.string().optional(),
  sourceType: z.string().optional(),
  status: z.string().optional(),
  vendor: z.string().optional(),
  contactName: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankDetail: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const createSupplementSchema = z.object({
  gymId: z.string().min(1, "Gym is required"),
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  stockQty: z.number().min(0, "Stock quantity must be non-negative"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  brand: z.string().optional(),
  buyingPrice: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  sqn: z.string().optional(),
  grn: z.string().optional(),
  supplierPriceNote: z.string().optional(),
});

module.exports = {
  createSaleSchema,
  createSaleReturnSchema,
  createMessageSchema,
  markMessagesReadSchema,
  createExpenseSchema,
  createSupplementSchema,
};
