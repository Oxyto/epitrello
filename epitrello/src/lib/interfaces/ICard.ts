import type { UUID } from "crypto";

export interface ICard {
    uuid: UUID;
    name: string;
    tags: [UUID];
    assignees: [UUID];
    due_date?: Date;
    description: string;
    checklist?: [[boolean, string]];
}
