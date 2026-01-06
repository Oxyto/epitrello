import { z } from 'zod';

export const CardSchema = z.object({
	uuid: z.uuidv7(),
	name: z.string(),
	description: z.string(),
	tags: z.array(z.uuidv7()).optional(),
	assignees: z.array(z.uuidv7()).optional(),
	date: z.union([z.date(), z.literal('')]),
	checklist: z.array(z.tuple([z.boolean(), z.string()])).optional()
});

export type ICard = z.infer<typeof CardSchema>;
