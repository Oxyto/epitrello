import type { UUID } from "crypto";

// IMPORTANT: Using UUID v7 ONLY
export interface IBoard {
    uuid: UUID;
    name: string;
    owner: UUID;
    editors: [UUID];
    viewers: [UUID];
    lists: [UUID];
    background_image_url?: string;
    theme?: string;
}
