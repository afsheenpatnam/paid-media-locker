import { z } from "zod";

export const uploadMediaSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  unlockPrice: z.coerce.number().int().min(0).max(1_000_000),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
