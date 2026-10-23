/**
 * Provider-scoped literal server messages shared by catalog reads and cart
 * writes. `requiresSelection` is a plain 400 message, not a structured error
 * code, so both capabilities compare against this typed value.
 */
export enum ClienteProviderServerMessage {
  RequiresSelection = 'requiresSelection',
}
