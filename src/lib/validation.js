/**
 * Centralized Zod validation schemas for all critical server action inputs.
 *
 * Usage in a server action:
 *
 *   import { JournalEntrySchema } from "@/lib/validation";
 *   import { err, E } from "@/lib/result";
 *
 *   const parsed = JournalEntrySchema.safeParse(rawInput);
 *   if (!parsed.success) {
 *     return err(E.VALIDATION_ERROR, parsed.error.errors[0].message);
 *   }
 *   const { memo, lines } = parsed.data;
 */

import { z } from "zod";

// ── Primitives ─────────────────────────────────────────────────────────────────

const NonEmptyString = (max = 500) =>
  z.string().trim().min(1, "This field is required.").max(max);

const OptionalString = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform(v => v || null);

const PositiveAmount = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/,/g, "")))
  .pipe(z.number().positive("Amount must be greater than zero.").finite());

const NonnegativeAmount = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/,/g, "")))
  .pipe(z.number().min(0).finite());

const IsoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Invalid date format.")
  .optional()
  .or(z.literal(""))
  .transform(v => v || null);

const UuidField = z.string().uuid("Invalid ID format.");
const OptionalUuid = z.string().uuid().optional().or(z.literal("")).transform(v => v || null);

// ── Finance ────────────────────────────────────────────────────────────────────

export const JournalLineSchema = z.object({
  accountId: UuidField,
  debit:     NonnegativeAmount,
  credit:    NonnegativeAmount,
}).refine(
  (line) => line.debit > 0 || line.credit > 0,
  "Each journal line must have a non-zero debit or credit."
);

export const JournalEntrySchema = z
  .object({
    memo:    NonEmptyString(180),
    fundId:  OptionalUuid,
    postedAt: IsoDateString,
    idempotencyKey: z.string().max(128).optional(),
    lines: z.array(JournalLineSchema).min(2, "At least two journal lines are required."),
  })
  .refine(
    (entry) => {
      const totalDebit  = entry.lines.reduce((s, l) => s + l.debit,  0);
      const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.001;
    },
    "Debits and credits must balance."
  );

export const PledgeSchema = z.object({
  memberId:  UuidField,
  fundId:    UuidField,
  amount:    PositiveAmount,
  startDate: IsoDateString,
  endDate:   IsoDateString,
});

export const FundSchema = z.object({
  name: NonEmptyString(120),
  code: z.string().trim().min(1).max(16).toUpperCase(),
});

export const LedgerAccountSchema = z.object({
  name: NonEmptyString(120),
  code: z.string().trim().min(1).max(16).toUpperCase(),
  type: z.enum(["asset", "liability", "equity", "income", "expense"], {
    errorMap: () => ({ message: "Account type must be asset, liability, equity, income, or expense." }),
  }),
});

// ── Care / Welfare ─────────────────────────────────────────────────────────────

const RESPONSE_WINDOWS = ["24-hours", "48-hours", "72-hours", "1-week", "ongoing"];
const PREFERRED_CONTACT = ["email", "phone", "whatsapp", "any"];

export const CareRequestSchema = z.object({
  submittedBy:      NonEmptyString(120),
  need:             NonEmptyString(120),
  summary:          OptionalString(1000),
  responseWindow:   z.enum(RESPONSE_WINDOWS).default("48-hours"),
  keepNamePrivate:  z.boolean().default(false),
  markSensitive:    z.boolean().default(false),
  allowContact:     z.boolean().default(false),
  preferredContact: z.enum(PREFERRED_CONTACT).default("any"),
  contactEmail:     z.string().email().max(254).optional().or(z.literal("")).transform(v => v || null),
  contactPhone:     z.string().max(32).optional().or(z.literal("")).transform(v => v || null),
  requestFor:       z.enum(["self", "family", "other"]).default("self"),
  idempotencyKey:   z.string().max(128).optional(),
});

// ── Members ────────────────────────────────────────────────────────────────────

export const MemberRegistrationSchema = z.object({
  name:       NonEmptyString(120),
  email:      z.string().trim().email("Please enter a valid email address.").max(254).toLowerCase(),
  phone:      z.string().trim().max(32).optional().or(z.literal("")).transform(v => v || null),
  password:   z.string().min(8, "Password must be at least 8 characters.").max(128),
  birthday:   IsoDateString,
  gender:     z.enum(["unspecified", "male", "female"]).default("unspecified"),
  memberType: z.enum(["member", "new_member", "visitor"]).default("member"),
});

export const UpdateMemberSchema = z.object({
  memberId: UuidField,
  name:     NonEmptyString(120),
  email:    z.string().trim().email().max(254).toLowerCase().optional().or(z.literal("")).transform(v => v || null),
  phone:    z.string().trim().max(32).optional().or(z.literal("")).transform(v => v || null),
  birthday: IsoDateString,
  gender:   z.enum(["unspecified", "male", "female"]).default("unspecified"),
  address:  OptionalString(300),
  city:     OptionalString(120),
  state:    OptionalString(120),
});

// ── Assets & Infrastructure ────────────────────────────────────────────────────

const ASSET_CATEGORIES = [
  "equipment", "vehicle", "instrument", "furniture",
  "technology", "property", "consumable", "other",
];

const UTILITY_TYPES = ["generator", "diesel", "water", "electricity", "gas", "other"];

export const AssetSchema = z.object({
  id:               OptionalUuid,
  name:             NonEmptyString(120),
  category:         z.enum(ASSET_CATEGORIES).default("equipment"),
  serialNumber:     OptionalString(80),
  location:         OptionalString(200),
  description:      OptionalString(500),
  acquisitionDate:  IsoDateString,
  acquisitionCost:  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().nonnegative().nullable()),
});

export const UtilityLogSchema = z.object({
  utilityType: z.enum(UTILITY_TYPES).default("generator"),
  value:       PositiveAmount,
  cost:        z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().nonnegative().nullable()),
  eventName:  OptionalString(120),
  note:       OptionalString(300),
  loggedAt:   IsoDateString,
});

// ── Permissions ────────────────────────────────────────────────────────────────

export const ModulePermissionSchema = z.object({
  userId:      UuidField,
  module:      z.enum(["care", "finance", "membership", "worship", "admin", "discipleship", "assets"]),
  accessLevel: z.enum(["none", "read", "worker", "lead", "full"]),
  note:        OptionalString(300),
});

// ── Attendance ─────────────────────────────────────────────────────────────────

export const AttendanceCheckInSchema = z.object({
  serviceId: UuidField,
  memberId:  UuidField,
  mode:      z.enum(["physical", "online", "hybrid"]).default("physical"),
});

// ── Discipleship ───────────────────────────────────────────────────────────────

export const DiscipleshipMilestoneSchema = z.object({
  memberId:            UuidField,
  foundationClass:     z.boolean(),
  baptized:            z.boolean(),
  attendingRegularly:  z.boolean(),
  smallGroupConnected: z.boolean(),
  serving:             z.boolean(),
  mentoringOthers:     z.boolean(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Parse a FormData object against a Zod schema, returning either
 * `{ ok: true, data }` or `{ ok: false, message }`.
 *
 * FormData values are all strings; each schema field must handle coercion.
 */
export function parseFormData(schema, formData) {
  const raw = {};
  for (const [key, value] of formData.entries()) {
    // Collect repeated keys as arrays (checkboxes, multi-select)
    if (key in raw) {
      if (!Array.isArray(raw[key])) raw[key] = [raw[key]];
      raw[key].push(value);
    } else {
      raw[key] = value;
    }
  }

  // Coerce checkbox "on"/"off" to booleans for boolean schema fields
  for (const key of Object.keys(raw)) {
    if (raw[key] === "on") raw[key] = true;
    if (raw[key] === "off") raw[key] = false;
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const firstError = result.error.errors[0];
  return {
    ok: false,
    message: firstError
      ? `${firstError.path.length ? firstError.path.join(".") + ": " : ""}${firstError.message}`
      : "Validation failed.",
  };
}
