const { z } = require("zod");

const createBankDetailSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  isDefault: z.boolean().optional(),
  openingBalance: z.number().min(0).optional(),
});

const createBankTransactionSchema = z.object({
  type: z.string().min(1, "Transaction type is required"),
  amount: z.number({ required_error: "Amount is required" }),
  description: z.string().min(1, "Description is required"),
  transactionDate: z.string().min(1, "Transaction date is required"),
  bankDetailId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const generatePayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

const createSalaryAdvanceSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
});

module.exports = {
  createBankDetailSchema,
  createBankTransactionSchema,
  generatePayrollSchema,
  createSalaryAdvanceSchema,
};
