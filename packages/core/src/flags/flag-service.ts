import { UnknownFlagError } from '../errors';
import type { Flag } from './flag';
import type { FlagRepository } from './flag-repository';

export interface FlagService {
  get(countryCode: string): Flag;
  getAll(): Flag[];
}

export class DefaultFlagService implements FlagService {
  private readonly byCode = new Map<string, Flag>();

  constructor(repository: FlagRepository) {
    for (const flag of repository.getAll()) {
      this.byCode.set(flag.countryCode.toUpperCase(), flag);
    }
  }

  get(countryCode: string): Flag {
    const flag = this.byCode.get(countryCode.trim().toUpperCase());
    if (!flag) {
      throw new UnknownFlagError(countryCode);
    }
    return flag;
  }

  getAll(): Flag[] {
    return [...this.byCode.values()];
  }
}
