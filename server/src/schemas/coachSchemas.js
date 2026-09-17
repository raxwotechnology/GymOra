const { z } = require("zod");

const createCoachSchema = z.object({
  gymId: z.string().min(1, "Gym is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  specialty: z.string().min(1, "Specialty is required"),
  phone: z.string().optional(),
  employmentType: z.string().optional(),
  salaryModel: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  shiftSchedule: z.string().optional(),
  specializations: z.union([z.string(), z.array(z.string())]).optional(),
  dateOfBirth: z.string().optional(),
  certifications: z.string().optional(),
});

const updateCoachSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  employmentType: z.string().optional(),
  salaryModel: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  shiftSchedule: z.string().optional(),
  specializations: z.union([z.string(), z.array(z.string())]).optional(),
  dateOfBirth: z.string().optional(),
  certifications: z.string().optional(),
});

const createSalaryAdvanceSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
});

const requestCoachLeaveSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});

const createCoachLeaveSchema = z.object({
  coachId: z.string().min(1, "Coach is required"),
  coachName: z.string().optional(),
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
  ownerNotes: z.string().optional(),
});

module.exports = {
  createCoachSchema,
  updateCoachSchema,
  createSalaryAdvanceSchema,
  requestCoachLeaveSchema,
  createCoachLeaveSchema,
};
