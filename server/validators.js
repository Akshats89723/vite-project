import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

const email    = z.string().trim().email("Invalid email address").max(254);
const password = z
  .string()
  .min(8,  "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/,      "Password must contain at least one uppercase letter")
  .regex(/[0-9]/,      "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const slug = z
  .string()
  .trim()
  .min(2,  "Slug must be at least 2 characters")
  .max(50, "Slug too long")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens");

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name:    z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email,
  password,
  // org fields (for new org creation)
  orgName: z.string().trim().min(2).max(100).optional(),
  orgSlug: slug.optional(),
  // invite code (for joining existing org)
  inviteCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotSchema = z.object({
  email,
});

export const resetSchema = z.object({
  token:       z.string().min(6).max(6),
  newPassword: password,
});

// ── Organization ──────────────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
});

// ── Employees ─────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  id:         z.string().trim().min(1).max(20),
  name:       z.string().trim().min(1).max(100),
  email,
  role:       z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  status:     z.enum(["Active","On Leave","Inactive"]).optional(),
  avatar:     z.string().url().optional().or(z.literal("")),
  contact:    z.string().trim().max(50).optional(),
  manager:    z.string().trim().max(100).optional(),
  salary:     z.string().trim().max(50).optional(),
});

export const updateEmployeeSchema = z.object({
  status:             z.enum(["Active","On Leave","Inactive"]).optional(),
  attendance:         z.string().trim().max(10).optional(),
  performance_rating: z.string().trim().max(5).optional(),
});

// ── Leaves ────────────────────────────────────────────────────────────────────

export const createLeaveSchema = z.object({
  id:        z.string().trim().min(1).max(20),
  requester: z.string().trim().min(1).max(100),
  type:      z.enum(["Annual Leave","Sick Leave","Casual Leave"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  days:      z.number().int().min(1).max(365),
  reason:    z.string().trim().min(1).max(500),
  status:    z.enum(["Pending","Approved","Rejected"]).optional(),
  // Support both snake and camelCase from frontend
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(["Pending","Approved","Rejected"]),
});

// ── Candidates ────────────────────────────────────────────────────────────────

export const createCandidateSchema = z.object({
  id:    z.string().trim().min(1).max(20),
  name:  z.string().trim().min(1).max(100),
  role:  z.string().trim().max(100).optional(),
  score: z.number().int().min(0).max(100).optional(),
  stage: z.enum(["Applied","Screened","Interviewing","Offered","Rejected"]).optional(),
  email: email.optional().or(z.literal("")),
});

export const updateCandidateStageSchema = z.object({
  stage: z.enum(["Applied","Screened","Interviewing","Offered","Rejected"]),
});

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  session: z.string().trim().max(100).optional(),
});

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  name:   z.string().trim().min(2).max(100).optional(),
  avatar: z.string().url().optional().or(z.literal("")).or(z.null()),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

// ── Invites ───────────────────────────────────────────────────────────────────

export const createInviteSchema = z.object({
  role:  z.enum(["admin","manager","employee"]).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const joinByInviteSchema = z.object({
  name:        z.string().trim().min(2).max(100),
  email,
  password,
  inviteToken: z.string().trim().min(1),
});

// ── Expenses ──────────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  category: z.enum(['Travel', 'Meals', 'Hardware', 'Software', 'L&D', 'Other']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  notes: z.string().trim().max(1000).optional(),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(["Pending", "Approved", "Rejected"]),
});

// ── Middleware factory ────────────────────────────────────────────────────────
// Usage: app.post("/route", validate(mySchema), handler)

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message).join("; ");
      return res.status(400).json({ error: messages });
    }
    req.body = result.data;
    next();
  };
}
