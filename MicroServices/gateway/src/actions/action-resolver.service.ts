import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ACTION_REGISTRY, type ActionMapping } from './action-registry';

export class ActionNotFoundError extends NotFoundException {
  constructor(service: string, action: string) {
    super(`Action "${service}/${action}" is not mapped. Check /api/v1/${service}/${action} for available actions.`);
  }
}

export class ServiceUnavailable extends ServiceUnavailableException {
  constructor(service: string) {
    super(`Service family "${service}" is not deployed yet.`);
  }
}

@Injectable()
export class ActionResolverService {
  /**
   * Resolve a service/action pair to its TCP mapping.
   * Throws ActionNotFoundError or ServiceUnavailable on failure.
   */
  resolve(service: string, action: string): ActionMapping {
    const family = ACTION_REGISTRY[service];
    if (!family) {
      throw new ActionNotFoundError(service, action);
    }

    if (family.status === 'unavailable') {
      throw new ServiceUnavailable(service);
    }

    const mapping = family.actions[action];
    if (!mapping) {
      throw new ActionNotFoundError(service, action);
    }

    return mapping;
  }
}
