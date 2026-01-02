import type { UUID } from "crypto";

// IMPORTANT: Using UUID v7 ONLY
export interface IUser {
    uuid: UUID;
    username: string;
    email: string;
    password_hash?: string;
    profile_picture_url?: string;
    boards: [UUID];
}
