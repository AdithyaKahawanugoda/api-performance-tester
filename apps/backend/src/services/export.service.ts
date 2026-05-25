import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import { getRun } from './run.service';
import { RequestLogModel } from '../db/models/index';
import type { TestRun } from '@api-perf/shared';

export async function exportRunAsCSV(runId: string): Promise<string> {
  const logs = await RequestLogModel.find({ runId })
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  const rows = [
    ['timestamp', 'method', 'url', 'statusCode', 'latencyMs', 'error'],
    ...logs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.method ?? '',
      l.url ?? '',
      String(l.statusCode ?? ''),
      String(l.latencyMs ?? ''),
      l.error ?? '',
    ]),
  ];

  return stringify(rows);
}

export async function generateRunPDF(runId: string): Promise<Buffer> {
  const run: TestRun = await getRun(runId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).font('Helvetica-Bold').text('API Performance Test Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Run ID: ${runId}`);
    doc.text(`Config: ${run.config.name}`);
    doc.text(`Status: ${run.status}`);
    doc.text(`Started: ${run.startedAt ? new Date(run.startedAt).toISOString() : 'N/A'}`);
    doc.text(`Completed: ${run.completedAt ? new Date(run.completedAt).toISOString() : 'N/A'}`);
    doc.moveDown();

    const m = run.metrics;
    if (m) {
      doc.fontSize(16).font('Helvetica-Bold').text('Summary Metrics');
      doc.fontSize(11).font('Helvetica');
      doc.moveDown(0.5);

      const rows: [string, string][] = [
        ['Total Requests', String(m.totalRequests)],
        ['Success Count', String(m.successCount)],
        ['Failure Count', String(m.failureCount)],
        ['Error Rate', `${(m.errorRate * 100).toFixed(2)}%`],
        ['Avg RPS', m.rps.toFixed(2)],
        ['Duration', `${(m.durationMs / 1000).toFixed(2)}s`],
        ['Min Latency', `${m.minLatency.toFixed(2)}ms`],
        ['Max Latency', `${m.maxLatency.toFixed(2)}ms`],
        ['Avg Latency', `${m.avgLatency.toFixed(2)}ms`],
        ['p50 Latency', `${m.p50.toFixed(2)}ms`],
        ['p95 Latency', `${m.p95.toFixed(2)}ms`],
        ['p99 Latency', `${m.p99.toFixed(2)}ms`],
      ];

      for (const [label, value] of rows) {
        doc.text(`${label}: ${value}`);
      }

      doc.moveDown();
      doc.fontSize(16).font('Helvetica-Bold').text('Test Configuration');
      doc.fontSize(11).font('Helvetica').moveDown(0.5);
      doc.text(`Concurrency: ${run.config.concurrency}`);
      doc.text(`Total Requests: ${run.config.totalRequests}`);
      doc.text(`Timeout: ${run.config.timeout}ms`);
      doc.text(`Retries: ${run.config.retries}`);
      doc.text(`Endpoints: ${run.config.endpoints.length}`);
    }

    doc.end();
  });
}
