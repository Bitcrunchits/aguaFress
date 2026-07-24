import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ACTION_REGISTRY, type ActionMapping, type ServiceFamily } from './action-registry';

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

export interface ParsedActionPath {
  /** The resolved action name (without entity ID) */
  readonly action: string;
  /** URL params including service, action, and optional id */
  readonly params: Record<string, string>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  /**
   * Parse the action path to extract the action name and optional entity ID.
   *
   * URL format: /v1/:service/:action[/:id]
   *
   * - If the full path matches a registered action → no ID (e.g. "profile/update")
   * - Otherwise → last segment is the ID (e.g. "change-estado/uuid" → action="change-estado", id="uuid")
   *
   * Throws BadRequestException if the ID segment is present but not a valid UUID.
   */
  parseActionPath(service: string, path: string): ParsedActionPath {
    const family = ACTION_REGISTRY[service];
    if (!family) {
      return { action: path, params: { service, action: path } };
    }

    // Full path matches a known action → use it directly (e.g. "profile/update")
    if (this.isKnownAction(family, path)) {
      return { action: path, params: { service, action: path } };
    }

    // Single segment that isn't a known action — let resolve() throw later
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      return { action: path, params: { service, action: path } };
    }

    const actionName = path.slice(0, lastSlash);
    const id = path.slice(lastSlash + 1);

    if (!id || !this.isKnownAction(family, actionName)) {
      return { action: path, params: { service, action: path } };
    }

    // Validate UUID format for entity IDs
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException(
        `Invalid entity ID in URL path "${path}". Expected a UUID, got "${id}".`,
      );
    }

    return { action: actionName, params: { service, action: actionName, id } };
  }

  private isKnownAction(family: ServiceFamily, action: string): boolean {
    return action in family.actions;
  }
}
