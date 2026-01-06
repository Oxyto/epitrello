import { z } from 'zod';

export const TagSchema = z.object({
    uuid: z.uuidv7(),
    name: z.string(),
    type: z.string(),
    attributes: z.array(z.string())
})

export type ITag = z.infer<typeof TagSchema>
