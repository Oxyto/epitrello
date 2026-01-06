import { z } from 'zod';

export const UserSchema = z.object({
	uuid: z.uuidv7(),
	admin: z.union([z.literal('yes'), z.literal('no')]),
	username: z.string(),
	email: z.email(),
	password_hash: z.union([z.hash('sha256'), z.literal('')]),
    profile_picture_url: z.union([z.url(), z.literal('')]),
    boards: z.array(z.uuidv7()).optional()
});

export type IUser = z.infer<typeof UserSchema>
