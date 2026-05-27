import { Types } from 'mongoose';
import { TestRunModel } from '../db/models/index';
import { getConfig } from './config.service';
import { enqueueTestJobs, cancelTestJobs } from './queue.service';
import { redisClient } from '../queue/redis.client';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { parsePagination, buildPaginatedResponse } from '../lib/pagination';
import type { PaginationQuery } from '../lib/pagination';
import type { TestRun, TestStatus } from '@api-perf/shared';

function toTestRun(doc: InstanceType<typeof TestRunModel>): TestRun {
  const obj = doc.toObject({ versionKey: false });
  const metrics = obj.metrics
    ? {
        ...obj.metrics,
        statusCodeDistribution:
          obj.metrics.statusCodeDistribution instanceof Map
            ? Object.fromEntries(obj.metrics.statusCodeDistribution)
            : (obj.metrics.statusCodeDistribution ?? {}),
      }
    : undefined;
  return {
    ...obj,
    id: String(obj._id),
    configId: String(obj.configId),
    metrics,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export async function startRun(configId: string): Promise<TestRun> {
  const config = await getConfig(configId);

  const doc = await TestRunModel.create({
    configId: new Types.ObjectId(configId),
    config,
    status: 'queued' as TestStatus,
  });

  const runId = String(doc._id);

  await TestRunModel.findByIdAndUpdate(runId, { status: 'running', startedAt: new Date() });

  const jobIds = await enqueueTestJobs(runId, config);
  await TestRunModel.findByIdAndUpdate(runId, { jobIds });

  const updated = await TestRunModel.findById(runId);
  return toTestRun(updated!);
}

export async function getRun(id: string): Promise<TestRun> {
  const doc = await TestRunModel.findById(id);
  if (!doc) throw new NotFoundError('TestRun');
  return toTestRun(doc);
}

export async function listRuns(
  query: PaginationQuery & { status?: string; configId?: string },
) {
  const { page, pageSize, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter['status'] = query.status;
  if (query.configId) filter['configId'] = new Types.ObjectId(query.configId);

  const [docs, total] = await Promise.all([
    TestRunModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    TestRunModel.countDocuments(filter),
  ]);

  const items = docs.map((d) => ({
    ...d,
    id: String(d._id),
    configId: String(d.configId),
  })) as unknown as TestRun[];

  return buildPaginatedResponse(items, total, page, pageSize);
}

export async function cancelRun(id: string): Promise<TestRun> {
  const doc = await TestRunModel.findById(id);
  if (!doc) throw new NotFoundError('TestRun');

  if (!['queued', 'running'].includes(doc.status)) {
    throw new BadRequestError(`Cannot cancel a run with status: ${doc.status}`);
  }

  await redisClient.set(`cancel:${id}`, '1', 'EX', 3600);

  if (doc.jobIds?.length) {
    await cancelTestJobs(doc.jobIds);
  }

  const updated = await TestRunModel.findByIdAndUpdate(
    id,
    { status: 'cancelled', completedAt: new Date() },
    { new: true },
  );
  return toTestRun(updated!);
}

export async function deleteRun(id: string): Promise<void> {
  const result = await TestRunModel.findByIdAndDelete(id);
  if (!result) throw new NotFoundError('TestRun');
}

export async function bulkDeleteRuns(ids: string[]): Promise<number> {
  const result = await TestRunModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount;
}

export async function compareRuns(ids: string[]): Promise<TestRun[]> {
  const runs = await Promise.all(ids.map((id) => getRun(id)));
  return runs;
}
