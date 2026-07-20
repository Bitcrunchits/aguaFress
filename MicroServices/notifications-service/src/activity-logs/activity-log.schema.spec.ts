import { ActivityLogResult, UserRole } from '@agua/contracts';
import { ActivityLogSchema } from './activity-log.schema';

describe('ActivityLogSchema', () => {
  it('defines required fields, enums, and query indexes', () => {
    expect(ActivityLogSchema.get('collection')).toBe('activity_logs');
    expect(ActivityLogSchema.path('createdAt').isRequired).toBe(true);
    expect(ActivityLogSchema.path('source').isRequired).toBe(true);
    expect(ActivityLogSchema.path('action').isRequired).toBe(true);
    expect(ActivityLogSchema.path('result').options.enum).toEqual(Object.values(ActivityLogResult));
    expect(ActivityLogSchema.path('actor.role').options.enum).toEqual(Object.values(UserRole));
    expect(ActivityLogSchema.indexes()).toEqual(expect.arrayContaining([
      [{ createdAt: -1 }, expect.any(Object)],
      [{ source: 1, action: 1 }, expect.any(Object)],
      [{ 'actor.userId': 1 }, expect.any(Object)],
      [{ result: 1 }, expect.any(Object)],
    ]));
  });
});
