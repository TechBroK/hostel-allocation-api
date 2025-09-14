import { z } from "zod";

export const personalityTraitsSchema = z.object({
  sleepSchedule: z.enum(["early", "flexible", "late"]).optional(),
  studyHabits: z.enum(["quiet", "mixed", "group"]).optional(),
  cleanlinessLevel: z.number().int().min(1).max(5).optional(),
  socialPreference: z.enum(["introvert", "balanced", "extrovert"]).optional(),
  noisePreference: z.enum(["quiet", "tolerant", "noisy"]).optional(),
  hobbies: z.array(z.string().min(1)).max(30).optional(),
  musicPreference: z.string().min(1).max(40).optional(),
  visitorFrequency: z.enum(["rarely", "sometimes", "often"]).optional(),
});

export const updatePersonalitySchema = z.object({
  body: z.object({
    personalityTraits: personalityTraitsSchema.refine((val) => Object.keys(val || {}).length > 0, {
      message: "At least one trait field must be provided",
    }),
  }),
});
