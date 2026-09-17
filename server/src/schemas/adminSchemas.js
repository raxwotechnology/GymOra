const { z } = require("zod");

const createGymSchema = z.object({
  name: z.string().min(1, "Gym name is required"),
  owner: z.string().min(1, "Owner name is required"),
  email: z.string().email("Invalid email address"),
  location: z.string().min(1, "Location is required"),
  plan: z.string().min(1, "Plan is required"),
  phone: z.string().optional(),
  website: z.string().optional(),
  facebookUrl: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  brNumber: z.string().optional(),
  description: z.string().optional(),
  subscriptionPlanId: z.string().optional(),
});

const updateGymSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  facebookUrl: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  brNumber: z.string().optional(),
  description: z.string().optional(),
  plan: z.string().optional(),
});

const addGymOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

const createSubscriptionPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  price: z.number({ required_error: "Price is required" }).min(0),
  billingCycle: z.string().min(1, "Billing cycle is required"),
  memberLimit: z.number().int().min(0).optional().nullable(),
  coachLimit: z.number().int().min(0).optional().nullable(),
  features: z.union([z.string(), z.array(z.string())]).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  trialDays: z.number().int().min(0).optional(),
  storageGb: z.number().min(0).optional(),
  supportLevel: z.string().optional(),
  customBranding: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
  analyticsAccess: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
  apiAccess: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
  maxLocations: z.number().int().min(1).optional(),
  smsCredits: z.number().int().min(0).optional(),
});

const assignGymSubscriptionSchema = z.object({
  subscriptionPlanId: z.string().min(1, "Subscription plan is required"),
  note: z.string().optional(),
  method: z.string().optional(),
});

const extendGymTrialSchema = z.object({
  newEndDate: z.string().min(1, "New end date is required"),
});

const sendBillingEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  type: z.string().optional(),
});

const sendBillingSmsSchema = z.object({
  message: z.string().min(1, "Message is required"),
  type: z.string().optional(),
});

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

module.exports = {
  createGymSchema,
  updateGymSchema,
  addGymOwnerSchema,
  createSubscriptionPlanSchema,
  assignGymSubscriptionSchema,
  extendGymTrialSchema,
  sendBillingEmailSchema,
  sendBillingSmsSchema,
  createBankDetailSchema,
  createBankTransactionSchema,
};
