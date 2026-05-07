import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IRequestLog extends Document {
  runId: Types.ObjectId;
  workerId?: number;
  method?: string;
  url?: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
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
    error: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    requestId: { type: String },
  },
  { timestamps: false },
);

RequestLogSchema.index({ runId: 1, timestamp: -1 });
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 * 7 });

export const RequestLogModel: Model<IRequestLog> = model<IRequestLog>('RequestLog', RequestLogSchema);
