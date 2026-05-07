import { TestConfigModel } from '../db/models/index';
import type { CreateTestConfigInput, UpdateTestConfigInput, TestConfig } from '@api-perf/shared';
import { NotFoundError } from '../lib/errors';
import { parsePagination, buildPaginatedResponse } from '../lib/pagination';
import type { PaginationQuery } from '../lib/pagination';

function toTestConfig(doc: InstanceType<typeof TestConfigModel>): TestConfig {
  const obj = doc.toObject({ versionKey: false });
  return {
    ...obj,
    id: String(obj._id),
    endpoints: obj.endpoints.map((e) => ({
      ...e,
      headers: e.headers instanceof Map ? Object.fromEntries(e.headers as Map<string, string>) : (e.headers ?? {}),
    })),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

export async function listConfigs(query: PaginationQuery & { tag?: string; search?: string }) {
  const { page, pageSize, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.tag) filter['tags'] = query.tag;
  if (query.search) filter['name'] = { $regex: query.search, $options: 'i' };

  const [docs, total] = await Promise.all([
    TestConfigModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    TestConfigModel.countDocuments(filter),
  ]);

  const items = docs.map((d) => ({
    ...d,
    id: String(d._id),
    endpoints: d.endpoints.map((e) => ({
      ...e,
      headers: e.headers instanceof Map ? Object.fromEntries(e.headers) : (e.headers ?? {}),
    })),
  })) as unknown as TestConfig[];

  return buildPaginatedResponse(items, total, page, pageSize);
}

export async function getConfig(id: string): Promise<TestConfig> {
  const doc = await TestConfigModel.findById(id);
  if (!doc) throw new NotFoundError('TestConfig');
  return toTestConfig(doc);
}

export async function createConfig(input: CreateTestConfigInput): Promise<TestConfig> {
  const doc = await TestConfigModel.create(input);
  return toTestConfig(doc);
}

export async function updateConfig(id: string, input: UpdateTestConfigInput): Promise<TestConfig> {
  const doc = await TestConfigModel.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!doc) throw new NotFoundError('TestConfig');
  return toTestConfig(doc);
}

export async function deleteConfig(id: string): Promise<void> {
  const result = await TestConfigModel.findByIdAndDelete(id);
  if (!result) throw new NotFoundError('TestConfig');
}
