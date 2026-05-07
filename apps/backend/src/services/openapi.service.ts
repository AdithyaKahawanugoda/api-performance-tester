import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI } from 'openapi-types';
import type { CreateTestConfigInput } from '@api-perf/shared';
import type { HttpMethod } from '@api-perf/shared';
import { BadRequestError } from '../lib/errors';

const SUPPORTED_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export async function parseOpenAPISpec(content: string, format: 'json' | 'yaml'): Promise<CreateTestConfigInput> {
  let parsed: OpenAPI.Document;

  try {
    parsed = await SwaggerParser.dereference(content as unknown as OpenAPI.Document);
  } catch (err) {
    throw new BadRequestError(`Invalid OpenAPI specification: ${(err as Error).message}`);
  }

  const endpoints: CreateTestConfigInput['endpoints'] = [];

  const paths = (parsed as Record<string, unknown>)['paths'] as Record<string, Record<string, unknown>> | undefined;
  if (!paths) throw new BadRequestError('No paths found in OpenAPI spec');

  const servers = (parsed as Record<string, unknown>)['servers'] as Array<{ url: string }> | undefined;
  const baseUrl = servers?.[0]?.url ?? 'http://localhost';

  for (const [path, methods] of Object.entries(paths)) {
    for (const method of SUPPORTED_METHODS) {
      const operation = methods[method.toLowerCase()] as Record<string, unknown> | undefined;
      if (!operation) continue;

      const url = `${baseUrl}${path}`;
      let body: unknown;

      const requestBody = operation['requestBody'] as Record<string, unknown> | undefined;
      if (requestBody) {
        const content = requestBody['content'] as Record<string, unknown> | undefined;
        const jsonContent = content?.['application/json'] as Record<string, unknown> | undefined;
        body = jsonContent?.['example'] ?? jsonContent?.['schema'];
      }

      const securitySchemes = (parsed as Record<string, unknown>)['components'] as
        | Record<string, unknown>
        | undefined;
      const headers: Record<string, string> = {};

      const security = operation['security'] as Array<Record<string, unknown>> | undefined;
      if (security?.length) {
        headers['Authorization'] = 'Bearer <YOUR_TOKEN>';
      }

      endpoints.push({ method, url, headers, body, weight: 1 });

      if (endpoints.length >= 20) break;
    }
    if (endpoints.length >= 20) break;
  }

  if (endpoints.length === 0) {
    throw new BadRequestError('No valid endpoints found in OpenAPI spec');
  }

  const title = ((parsed as Record<string, unknown>)['info'] as Record<string, unknown> | undefined)?.['title'] as string | undefined;

  return {
    name: title ? `${title} Load Test` : 'Imported API Load Test',
    description: `Auto-generated from OpenAPI specification`,
    endpoints,
    concurrency: 10,
    totalRequests: 100,
    rampUpSeconds: 0,
    timeout: 5000,
    retries: 0,
  };
}
