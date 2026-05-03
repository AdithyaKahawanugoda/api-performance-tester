import { z } from 'zod';

export const OpenAPIImportSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1),
  format: z.enum(['json', 'yaml']).default('json'),
});

export type OpenAPIImportInput = z.infer<typeof OpenAPIImportSchema>;
