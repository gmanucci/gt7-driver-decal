import type { Flag } from './flag';

export interface FlagRepository {
  getAll(): readonly Flag[];
}

export class InMemoryFlagRepository implements FlagRepository {
  constructor(private readonly flags: readonly Flag[]) {}

  getAll(): readonly Flag[] {
    return this.flags;
  }
}
