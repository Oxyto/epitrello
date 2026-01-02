import type { UUID } from "crypto";

// IMPORTANT: Using UUID v7 ONLY
export interface Itag {
    uuid: UUID;
    name: string;
    type: string;
    attributes: [string];
}
