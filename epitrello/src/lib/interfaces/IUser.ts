import type { UUID } from "crypto";

export interface IUser {
    uuid: UUID;
    username: string;
    email: string;
    password_hash?: string;
    profile_picture_url?: string;
    boards_uuid: [string];
    
}
