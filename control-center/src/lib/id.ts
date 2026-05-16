import { randomUUID } from "crypto";

export function makeId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}
