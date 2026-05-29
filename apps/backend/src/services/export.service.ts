import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import { getRun } from './run.service';
import { RequestLogModel } from '../db/models/index';
import type { TestRun, EndpointStats } from '@api-perf/shared';

export async function exportRunAsCSV(runId: string): Promise<string> {
  const logs = await RequestLogModel.find({ runId })
    .sort({ timestamp: -1 })
    .limit(10000)
    .lean();

  const rows = [
    ['timestamp', 'method', 'url', 'statusCode', 'latencyMs', 'ttfbMs', 'responseSizeBytes', 'cacheStatus', 'error', 'errorBody'],
    ...logs.map((l) => [
      new Date(l.timestamp).toISOString(),
      l.method ?? '',
      l.url ?? '',
      String(l.statusCode ?? ''),
      String(l.latencyMs ?? ''),
      l.ttfbMs != null ? String(l.ttfbMs) : '',
      l.responseSizeBytes != null ? String(l.responseSizeBytes) : '',
      l.cacheStatus ?? '',
      l.error ?? '',
      l.errorBody ?? '',
    ]),
  ];

  return stringify(rows);
}

// ── PDF helpers ──────────────────────────────────────────────────────────────

const DARK = '#111827';
const MID = '#374151';
const MUTED = '#6B7280';
const ACCENT = '#4F46E5';
const RULE = '#E5E7EB';
const GREEN = '#059669';
const RED = '#DC2626';
const YELLOW = '#D97706';

function fmt(n: number | undefined | null, unit: string, decimals = 2): string {
  if (n == null) return '—';
  return `${n.toFixed(decimals)}${unit}`;
}

function fmtBytes(bytes: number | undefined | null): string {
  if (bytes == null || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtPct(rate: number | undefined | null): string {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(DARK)
    .text(title);
  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .strokeColor(RULE)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
}

function kpiRow(doc: PDFKit.PDFDocument, pairs: [string, string][], cols = 3) {
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colW = pageW / cols;
  const startX = doc.page.margins.left;
  const startY = doc.y;

  pairs.forEach(([label, value], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * colW;
    const y = startY + row * 44;

    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(label.toUpperCase(), x, y, { width: colW - 8 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK).text(value, x, y + 12, { width: colW - 8 });
  });

  const rows = Math.ceil(pairs.length / cols);
  doc.y = startY + rows * 44 + 4;
}

function tableRow(
  doc: PDFKit.PDFDocument,
  cells: string[],
  colWidths: number[],
  startX: number,
  y: number,
  isHeader: boolean,
) {
  const rowH = 20;
  const bg = isHeader ? '#F3F4F6' : null;

  if (bg) {
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    doc.rect(startX, y, totalW, rowH).fillColor(bg).fill();
  }

  let x = startX;
  cells.forEach((cell, i) => {
    doc
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(isHeader ? 8 : 8.5)
      .fillColor(isHeader ? MUTED : DARK)
      .text(cell, x + 4, y + 5, { width: (colWidths[i] ?? 80) - 8, ellipsis: true });
    x += colWidths[i] ?? 80;
  });

  const totalW = colWidths.reduce((a, b) => a + b, 0);
  doc
    .moveTo(startX, y + rowH)
    .lineTo(startX + totalW, y + rowH)
    .strokeColor(RULE)
    .lineWidth(0.5)
    .stroke();

  return y + rowH;
}

function endpointTable(doc: PDFKit.PDFDocument, stats: EndpointStats[]) {
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;

  const hasTtfb = stats.some((s) => s.avgTtfbMs != null);
  const hasSize = stats.some((s) => (s.avgResponseBytes ?? 0) > 0);
  const hasCache = stats.some((s) => s.cacheHitRate != null);

  const colWidths: number[] = (() => {
    const methodW = 48;
    const p99W = 50;
    const successW = 52;
    const failW = 44;
    const ttfbW = hasTtfb ? 54 : 0;
    const sizeW = hasSize ? 56 : 0;
    const cacheW = hasCache ? 54 : 0;
    const urlW = pageW - methodW - p99W - successW - failW - ttfbW - sizeW - cacheW - 60;
    const avgW = 60;
    return [methodW, urlW, avgW, p99W, successW, failW, ...(hasTtfb ? [ttfbW] : []), ...(hasSize ? [sizeW] : []), ...(hasCache ? [cacheW] : [])];
  })();

  const headers = [
    'Method', 'URL', 'Avg Lat', 'p99', 'Success', 'Fail',
    ...(hasTtfb ? ['Avg TTFB'] : []),
    ...(hasSize ? ['Avg Size'] : []),
    ...(hasCache ? ['Cache Hit'] : []),
  ];

  let y = doc.y;
  y = tableRow(doc, headers, colWidths, startX, y, true);

  for (const s of stats) {
    if (y > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      y = doc.page.margins.top;
      y = tableRow(doc, headers, colWidths, startX, y, true);
    }
    const urlShort = s.url.length > 50 ? s.url.slice(0, 48) + '…' : s.url;
    const cells = [
      s.method,
      urlShort,
      fmt(s.avgLatency, 'ms', 1),
      fmt(s.p99, 'ms', 1),
      String(s.successCount),
      String(s.failureCount),
      ...(hasTtfb ? [fmt(s.avgTtfbMs, 'ms', 1)] : []),
      ...(hasSize ? [fmtBytes(s.avgResponseBytes)] : []),
      ...(hasCache ? [fmtPct(s.cacheHitRate)] : []),
    ];
    y = tableRow(doc, cells, colWidths, startX, y, false);
  }

  doc.y = y + 6;
}

export async function generateRunPDF(runId: string): Promise<Buffer> {
  const run: TestRun = await getRun(runId);
  const m = run.metrics;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Cover header ──────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 80)
      .fillColor(ACCENT)
      .fill();

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#FFFFFF')
      .text('API Performance Test Report', doc.page.margins.left, 22, { align: 'center' });

    doc.y = 96;

    // Run metadata
    doc
      .font('Helvetica-Bold').fontSize(17).fillColor(DARK)
      .text(run.config.name, { align: 'left' });

    doc.moveDown(0.3);

    const metaLeft: [string, string][] = [
      ['Run ID', runId],
      ['Status', run.status.toUpperCase()],
      ['Started', run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'],
      ['Completed', run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'],
    ];

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const halfW = pageW / 2;
    const baseY = doc.y;

    metaLeft.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = doc.page.margins.left + col * halfW;
      const y = baseY + row * 18;
      doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(label + ': ', x, y, { continued: true });
      doc.font('Helvetica-Bold').fillColor(DARK).text(value);
    });

    doc.y = baseY + Math.ceil(metaLeft.length / 2) * 18 + 4;

    if (run.error) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9.5).fillColor(RED).text(`Error: ${run.error}`);
    }

    // ── Summary metrics ───────────────────────────────────────────────────────
    if (m) {
      sectionHeader(doc, 'Summary');

      const kpis: [string, string][] = [
        ['Total Requests', m.totalRequests.toLocaleString()],
        ['Success', m.successCount.toLocaleString()],
        ['Failures', m.failureCount.toLocaleString()],
        ['Error Rate', fmtPct(m.errorRate)],
        ['Avg RPS', fmt(m.rps, ' req/s', 1)],
        ['Duration', `${(m.durationMs / 1000).toFixed(2)}s`],
        ['Bytes Received', fmtBytes(m.bytesReceived || null)],
        ['Avg TTFB', m.avgTtfbMs != null ? fmt(m.avgTtfbMs, 'ms', 1) : '—'],
      ];
      kpiRow(doc, kpis, 4);

      // ── Latency percentiles ────────────────────────────────────────────────
      sectionHeader(doc, 'Latency');

      const latencies: [string, string][] = [
        ['Min', fmt(m.minLatency, 'ms', 1)],
        ['Avg', fmt(m.avgLatency, 'ms', 1)],
        ['p50 (Median)', fmt(m.p50, 'ms', 1)],
        ['p95', fmt(m.p95, 'ms', 1)],
        ['p99', fmt(m.p99, 'ms', 1)],
        ['Max', fmt(m.maxLatency, 'ms', 1)],
        ['Avg TTFB', m.avgTtfbMs != null ? fmt(m.avgTtfbMs, 'ms', 1) : '—'],
        ['p95 TTFB', m.p95TtfbMs != null ? fmt(m.p95TtfbMs, 'ms', 1) : '—'],
      ];
      kpiRow(doc, latencies, 4);

      // ── Status code distribution ───────────────────────────────────────────
      if (m.statusCodeDistribution && Object.keys(m.statusCodeDistribution).length > 0) {
        sectionHeader(doc, 'Status Code Distribution');

        const distEntries = Object.entries(m.statusCodeDistribution).sort(([a], [b]) => Number(a) - Number(b));
        const colW2 = pageW / 4;
        const startX2 = doc.page.margins.left;
        const startY2 = doc.y;

        distEntries.forEach(([code, count], i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = startX2 + col * colW2;
          const y = startY2 + row * 36;
          const pct = m.totalRequests > 0 ? ((count / m.totalRequests) * 100).toFixed(1) : '0';
          const codeNum = Number(code);
          const color = codeNum < 300 ? GREEN : codeNum < 400 ? ACCENT : RED;
          doc.font('Helvetica-Bold').fontSize(16).fillColor(color).text(code, x, y, { width: colW2 - 8 });
          doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(`${count.toLocaleString()} (${pct}%)`, x, y + 18, { width: colW2 - 8 });
        });

        doc.y = startY2 + Math.ceil(distEntries.length / 4) * 36 + 8;
      }

      // ── System resources ───────────────────────────────────────────────────
      if (m.peakMemoryMb != null || m.avgCpuPercent != null) {
        sectionHeader(doc, 'Worker Resources');

        const resPairs: [string, string][] = [];
        if (m.avgCpuPercent != null) resPairs.push(['Avg CPU', `${m.avgCpuPercent.toFixed(1)}%`]);
        if (m.peakMemoryMb != null) resPairs.push(['Peak Memory', `${m.peakMemoryMb.toFixed(0)} MB`]);
        kpiRow(doc, resPairs, 4);
      }

      // ── Per-endpoint stats ─────────────────────────────────────────────────
      if (m.endpointStats && m.endpointStats.length > 0) {
        sectionHeader(doc, 'Per-Endpoint Stats');
        endpointTable(doc, m.endpointStats);
      }

      // ── Error samples ──────────────────────────────────────────────────────
      const endpointsWithErrors = (m.endpointStats ?? []).filter(
        (e) => e.errorSamples && e.errorSamples.length > 0,
      );
      if (endpointsWithErrors.length > 0) {
        sectionHeader(doc, 'Error Samples');
        for (const ep of endpointsWithErrors) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(MID).text(`${ep.method} ${ep.url}`, { continued: false });
          doc.moveDown(0.2);
          for (const sample of ep.errorSamples!.slice(0, 3)) {
            doc
              .font('Helvetica')
              .fontSize(8)
              .fillColor(RED)
              .text(sample.length > 200 ? sample.slice(0, 198) + '…' : sample, {
                indent: 10,
              });
          }
          doc.moveDown(0.4);
        }
      }
    }

    // ── Test configuration ────────────────────────────────────────────────────
    sectionHeader(doc, 'Test Configuration');

    doc.font('Helvetica').fontSize(9.5).fillColor(DARK);
    const cfgPairs: [string, string][] = [
      ['Concurrency', String(run.config.concurrency)],
      ['Total Requests', run.config.totalRequests.toLocaleString()],
      ['Timeout', `${run.config.timeout}ms`],
      ['Retries', String(run.config.retries)],
      ['Capture Response Size', run.config.captureResponseSize ? 'Yes' : 'No'],
    ];
    if (run.config.description) cfgPairs.splice(0, 0, ['Description', run.config.description]);

    kpiRow(doc, cfgPairs, 3);

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(MID).text('Endpoints:');
    doc.moveDown(0.2);

    for (const ep of run.config.endpoints) {
      doc.font('Helvetica').fontSize(9).fillColor(DARK);
      const weightStr = ep.weight && ep.weight !== 1 ? ` (weight: ${ep.weight})` : '';
      doc.text(`  ${ep.method}  ${ep.url}${weightStr}`);
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Generated ${new Date().toLocaleString()} · API Performance Tester`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: 'center', width: pageW },
      );

    doc.end();
  });
}
