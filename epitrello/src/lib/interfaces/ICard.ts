import type { UUID } from "crypto";

// IMPORTANT: Using UUID v7 ONLY
export interface ICard {
    uuid: UUID;
    name: string;
    tags: [UUID];
    assignees?: [UUID];
    due_date?: Date;
    description: string;
    checklist?: [[boolean, string]];
}
