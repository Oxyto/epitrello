import { z } from 'zod';

export const ListSchema = z.object({
    uuid: z.uuidv7()
})
