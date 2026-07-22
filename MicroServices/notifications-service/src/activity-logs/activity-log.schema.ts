import { ActivityLogAction, ActivityLogResult, ActivityLogSource, UserRole, type ActivityLogActorDTO, type ActivityLogEntityDTO } from '@agua/contracts';
import { Schema, Types } from 'mongoose';

export const ACTIVITY_LOG_MODEL = 'ActivityLog';

export interface ActivityLogModelRecord {
  readonly _id: Types.ObjectId;
  readonly createdAt: Date;
  readonly source: string;
  readonly action: string;
  readonly actor: ActivityLogActorDTO;
  readonly entity: ActivityLogEntityDTO;
  readonly result: ActivityLogResult;
  readonly summary: string;
  readonly metadata: Record<string, unknown>;
  readonly requestId?: string;
  readonly dedupeKey?: string;
}

const ActivityLogActorSchema = new Schema<ActivityLogActorDTO>(
  {
    userId: { type: String, required: false },
    email: { type: String, required: false },
    role: { type: String, enum: Object.values(UserRole), required: false },
  },
  { _id: false },
);

const ActivityLogEntitySchema = new Schema<ActivityLogEntityDTO>(
  {
    type: { type: String, required: false },
    id: { type: String, required: false },
  },
  { _id: false },
);

export const ActivityLogSchema = new Schema<ActivityLogModelRecord>(
  {
    createdAt: { type: Date, required: true, default: Date.now },
    source: { type: String, enum: Object.values(ActivityLogSource), required: true },
    action: { type: String, enum: Object.values(ActivityLogAction), required: true },
    actor: { type: ActivityLogActorSchema, required: true, default: {} },
    entity: { type: ActivityLogEntitySchema, required: true, default: {} },
    result: { type: String, enum: Object.values(ActivityLogResult), required: true },
    summary: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, required: true, default: {} },
    requestId: { type: String, required: false },
    dedupeKey: { type: String, required: false },
  },
  {
    collection: 'activity_logs',
    versionKey: false,
  },
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ source: 1, action: 1 });
ActivityLogSchema.index({ 'actor.userId': 1 });
ActivityLogSchema.index({ result: 1 });
ActivityLogSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
