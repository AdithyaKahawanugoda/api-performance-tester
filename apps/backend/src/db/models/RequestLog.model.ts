import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IRequestLog extends Document {
  runId: Types.ObjectId;
  workerId?: number;
  method?: string;
  url?: string;
  statusCode?: number;
  latencyMs?: number;
  ttfbMs?: number;
  responseSizeBytes?: number;
  cacheStatus?: 'hit' | 'miss' | 'unknown';
  error?: string;
  errorBody?: string;
  timestamp: Date;
  requestId?: string;
}

const RequestLogSchema = new Schema<IRequestLog>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'TestRun', required: true, index: true },
    workerId: { type: Number },
    method: { type: String },
    url: { type: String },
    statusCode: { type: Number },
    latencyMs: { type: Number },
    ttfbMs: { type: Number },
    responseSizeBytes: { type: Number },
    cacheStatus: { type: String, enum: ['hit', 'miss', 'unknown'] },
    error: { type: String },
    errorBody: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    requestId: { type: String },
  },
  { timestamps: false },
);

RequestLogSchema.index({ runId: 1, timestamp: -1 });
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 * 7 });

export const RequestLogModel: Model<IRequestLog> = model<IRequestLog>('RequestLog', RequestLogSchema);
