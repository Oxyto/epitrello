import { z } from 'zod';

export const ListSchema = z.object({
	uuid: z.uuidv7(),
	name: z.string(),
    board: z.uuidv7(),
    order: z.number(),
	cards: z.array(z.uuidv7()).optional()
});

export type IList = z.infer<typeof ListSchema>;
