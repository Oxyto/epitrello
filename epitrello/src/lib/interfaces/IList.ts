import { z } from 'zod';

export const ListSchema = z.object({
	uuid: z.uuidv7(),
	name: z.string(),
	cards: z.array(z.uuidv7()).optional()
});

export type IList = z.infer<typeof ListSchema>;
