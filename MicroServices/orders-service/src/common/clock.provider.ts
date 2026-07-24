export type Clock = () => Date;

export const CLOCK = Symbol.for('orders.clock');

export const systemClock: Clock = () => new Date();
