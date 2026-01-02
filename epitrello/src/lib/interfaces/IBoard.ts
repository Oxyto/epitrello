import type { UUID } from "crypto";

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
