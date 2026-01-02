import type { UUID } from "crypto";

export interface Itag {
    uuid: UUID;
    name: string;
    color: string;
    type: string;
}
