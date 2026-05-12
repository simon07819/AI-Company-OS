import type { RuntimeCheckpoint } from "./types";

export class InMemoryCheckpointStore {
  private checkpoints: RuntimeCheckpoint[] = [];

  add(checkpoint: RuntimeCheckpoint) {
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  all() {
    return [...this.checkpoints];
  }
}
