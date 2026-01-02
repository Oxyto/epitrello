import type { UUID } from "crypto";

export interface Itag {
    uuid: UUID;
    name: string;
    type: string;
    attributes: [string];
}
