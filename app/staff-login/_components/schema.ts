import * as z from "zod";

export const staffLoginFormSchema = z.object({
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  username: z.string().optional().or(z.literal("")),
  pin: z
    .string()
    .min(4, "PIN must be at least 4 digits")
    .max(6, "PIN must be at most 6 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),
}).refine((data) => {
  // Either email or username must be provided
  return data.email || data.username;
}, {
  message: "Please provide either email or username",
  path: ["email"], // This will show the error on the email field
});
