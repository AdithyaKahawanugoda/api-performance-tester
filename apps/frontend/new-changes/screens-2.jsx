/* Run detail (Live + Completed), Compare, New config */
/* global React, Icon, Sparkline, KPI, RunStatus, Method, LineChart, BarGroupChart, Donut, PercentileBars, StatusStrip, AppData, Screens1 */

const { useEffect, useMemo, useRef, useState } = React;
const { PageHead } = window.Screens1;

/* ====================================================
   Run detail — LIVE
   ==================================================== */
function RunLiveScreen({ go, runId }) {
  // Animated metrics
  const [tick, setTick] = useState(0);
  const [series, setSeries] = useState(() => ({
    p50: AppData.makeLatencySeries(40, 90, 35),
    p95: AppData.makeLatencySeries(40, 220, 70),
    p99: AppData.makeLatencySeries(40, 380, 120),
    rps: AppData.makeLatencySeries(40, 290, 50),
    err: AppData.makeLatencySeries(40, 1.2, 0.8),
  }));
  const [logs, setLogs] = useState(() => makeInitialLogs());
  const logRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setSeries(s => {
        const noise = () => (Math.random() - 0.5);
        const next = {
          p50: [...s.p50.slice(1), Math.max(20, s.p50[s.p50.length - 1] + noise() * 18)],
          p95: [...s.p95.slice(1), Math.max(80, s.p95[s.p95.length - 1] + noise() * 36)],
          p99: [...s.p99.slice(1), Math.max(160, s.p99[s.p99.length - 1] + noise() * 60)],
          rps: [...s.rps.slice(1), Math.max(120, s.rps[s.rps.length - 1] + noise() * 24)],
          err: [...s.err.slice(1), Math.max(0, s.err[s.err.length - 1] + noise() * 0.6)],
        };
        return next;
      });
      setLogs(prev => [...makeNewLogs(2), ...prev].slice(0, 50));
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const latest = {
    p50: series.p50[series.p50.length - 1],
    p95: series.p95[series.p95.length - 1],
    p99: series.p99[series.p99.length - 1],
    rps: series.rps[series.rps.length - 1],
    err: series.err[series.err.length - 1],
  };

  const elapsed = 173 + tick;
  const min = Math.floor(elapsed / 60), sec = elapsed % 60;
  const totalReq = 18420 + tick * 12;

  return (
    <div className="page" data-screen-label="Run Live">
      {/* Run header */}
      <div className="pagehead">
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => go('runs')}>
              <Icon name="chevron" size={11} style={{ transform: 'rotate(180deg)' }} /> Runs
            </button>
            <span className="dimmer">/</span>
            <span className="mono dim" style={{ fontSize: 11 }}>{runId || 'run_8f3a'}</span>
          </div>
          <h1 className="pagehead__title">Search · sustained load</h1>
          <div className="pagehead__sub row" style={{ gap: 10 }}>
            <RunStatus status="running" />
            <span>Started 3m ago</span>
            <span className="dimmer">·</span>
            <span className="mono">elapsed {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}</span>
            <span className="dimmer">·</span>
            <span>50 workers</span>
            <span className="dimmer">·</span>
            <span>3 endpoints</span>
          </div>
        </div>
        <div className="pagehead__actions">
          <button className="btn"><Icon name="download" /> Export</button>
          <button className="btn btn--danger"><Icon name="stop" size={12} /> Cancel run</button>
        </div>
      </div>

      {/* Live banner */}
      <div className="card" style={{ background: 'var(--bg-1)', marginBottom: 14, padding: 0 }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="live-dot">LIVE</span>
          <span className="dim" style={{ fontSize: 12 }}>Streaming metrics over WebSocket · 50 windows / sec</span>
          <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
            {totalReq.toLocaleString()} / 25,000 requests · {((totalReq / 25000) * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ height: 3, background: 'var(--bg-2)' }}>
          <div style={{
            width: ((totalReq / 25000) * 100) + '%',
            height: '100%',
            background: 'var(--accent)',
            transition: 'width 0.4s',
          }} />
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid-4">
        <KPI live label="Current RPS" value={Math.round(latest.rps)} sub={`window avg`} delta="2.4%" deltaDirection="up" />
        <KPI live label="p50 latency" value={Math.round(latest.p50)} unit="ms" sub={`baseline 92ms`} delta="3.1%" deltaDirection="down" />
        <KPI live label="p99 latency" value={Math.round(latest.p99)} unit="ms" sub={`baseline 387ms`} delta="6.4%" deltaDirection="up" />
        <KPI live label="Errors / window" value={Math.round(latest.err * 10) / 10} sub={`${Math.round(latest.err * 100)} total`} delta="—" deltaDirection="up" />
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        {/* Latency over time */}
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Latency percentiles</div>
              <div className="card__sub">Live · 1s windows · last 40s</div>
            </div>
            <div className="legend">
              <span><span className="legend__swatch" style={{ background: 'var(--accent)' }} />p50</span>
              <span><span className="legend__swatch" style={{ background: 'var(--info)' }} />p95</span>
              <span><span className="legend__swatch" style={{ background: 'var(--warn)' }} />p99</span>
            </div>
          </div>
          <div className="card__body">
            <LineChart
              series={[
                { name: 'p50', color: 'var(--accent)', data: series.p50 },
                { name: 'p95', color: 'var(--info)', data: series.p95 },
                { name: 'p99', color: 'var(--warn)', data: series.p99 },
              ]}
              animate
              tick={40}
              height={240}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card__head">
              <div className="card__title">Requests / second</div>
              <span className="mono dim" style={{ fontSize: 11 }}>peak {Math.round(Math.max(...series.rps))}</span>
            </div>
            <div className="card__body">
              <LineChart
                series={[{ name: 'rps', color: 'var(--accent)', data: series.rps }]}
                height={180}
              />
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Error rate</div>
              <span className="mono dim" style={{ fontSize: 11 }}>{(latest.err / Math.round(latest.rps) * 100).toFixed(2)}%</span>
            </div>
            <div className="card__body">
              <LineChart
                series={[{ name: 'err', color: 'var(--err)', data: series.err }]}
                height={180}
              />
            </div>
          </div>
        </div>

        {/* Endpoints + Live log */}
        <div className="grid responsive-split" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1.1fr 1.4fr' }}>
          <div className="card">
            <div className="card__head">
              <div className="card__title">Endpoint breakdown</div>
              <span className="dim" style={{ fontSize: 11 }}>weighted traffic</span>
            </div>
            <div className="card__body card__body--flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th className="right">Weight</th>
                    <th className="right">Success</th>
                    <th className="right">Fail</th>
                    <th className="right">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {AppData.liveEndpoints.map((e, i) => (
                    <tr key={i}>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <Method>{e.method}</Method>
                          <span className="mono" style={{ fontSize: 11.5 }}>{e.path}</span>
                        </div>
                      </td>
                      <td className="right mono">{e.weight}%</td>
                      <td className="right mono up">{e.success.toLocaleString()}</td>
                      <td className="right mono" style={{ color: e.fail > 50 ? 'var(--err)' : 'var(--fg-1)' }}>{e.fail}</td>
                      <td className="right mono">{e.p99}<span className="dimmer"> ms</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Live request log</div>
                <div className="card__sub mono" style={{ fontSize: 11 }}>tail · last 50 requests</div>
              </div>
              <div className="live-dot">streaming</div>
            </div>
            <div className="card__body">
              <div className="log" ref={logRef}>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Method</th>
                      <th>URL</th>
                      <th className="right">Status</th>
                      <th className="right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l, i) => (
                      <tr key={l.k} className={i < 2 ? 'flash' : ''}>
                        <td className="dim">{l.time}</td>
                        <td><Method>{l.method}</Method></td>
                        <td style={{ color: 'var(--fg-1)' }}>{l.url}</td>
                        <td className={'right st-' + Math.floor(l.status / 100)}>{l.status}</td>
                        <td className="right" style={{ color: l.latency > 400 ? 'var(--warn)' : 'var(--fg-1)' }}>
                          {l.latency}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function makeInitialLogs() {
  const urls = [
    { m: 'GET', u: '/search?q=wireless+headphones' },
    { m: 'GET', u: '/search?q=running+shoes&page=2' },
    { m: 'GET', u: '/search/suggest?prefix=lap' },
    { m: 'POST', u: '/search/index' },
    { m: 'GET', u: '/search?q=coffee&sort=price' },
    { m: 'GET', u: '/search/suggest?prefix=watch' },
  ];
  const out = [];
  for (let i = 0; i < 30; i++) {
    const r = urls[i % urls.length];
    const status = Math.random() > 0.97 ? (Math.random() > 0.5 ? 500 : 404) : 200;
    out.push({
      k: 'l' + i + '_' + Math.random(),
      time: nowMinus(i * 0.4),
      method: r.m,
      url: r.u,
      status,
      latency: Math.round(80 + Math.random() * 350),
    });
  }
  return out;
}

function makeNewLogs(n) {
  const urls = [
    { m: 'GET', u: '/search?q=wireless+headphones' },
    { m: 'GET', u: '/search/suggest?prefix=mat' },
    { m: 'POST', u: '/search/index' },
    { m: 'GET', u: '/search?q=tea&page=3' },
  ];
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = urls[Math.floor(Math.random() * urls.length)];
    const status = Math.random() > 0.95 ? (Math.random() > 0.5 ? 500 : 503) : 200;
    out.push({
      k: 'l_' + Date.now() + '_' + i,
      time: nowMinus(0),
      method: r.m,
      url: r.u,
      status,
      latency: Math.round(80 + Math.random() * 380),
    });
  }
  return out;
}

function nowMinus(sec) {
  const d = new Date(Date.now() - sec * 1000);
  return d.toTimeString().slice(0, 8);
}

/* ====================================================
   Run detail — COMPLETED
   ==================================================== */
function RunCompletedScreen({ go }) {
  const [tab, setTab] = useState('overview');

  return (
    <div className="page" data-screen-label="Run Completed">
      <div className="pagehead">
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => go('runs')}>
              <Icon name="chevron" size={11} style={{ transform: 'rotate(180deg)' }} /> Runs
            </button>
            <span className="dimmer">/</span>
            <span className="mono dim" style={{ fontSize: 11 }}>run_8f1c</span>
          </div>
          <h1 className="pagehead__title">Catalog v2 · regression</h1>
          <div className="pagehead__sub row" style={{ gap: 10 }}>
            <RunStatus status="completed" />
            <span>Completed 1h ago</span>
            <span className="dimmer">·</span>
            <span className="mono">duration 4m 12s</span>
            <span className="dimmer">·</span>
            <span>25 workers</span>
            <span className="dimmer">·</span>
            <span>6 endpoints</span>
          </div>
        </div>
        <div className="pagehead__actions">
          <button className="btn"><Icon name="download" /> CSV</button>
          <button className="btn"><Icon name="download" /> PDF</button>
          <button className="btn btn--primary"><Icon name="run" size={11} /> Re-run</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'endpoints', 'requests', 'config'].map((t) => (
          <div key={t} className={'tabs__item ' + (tab === t ? 'is-active' : '')} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="stack">
          {/* Top KPI grid */}
          <div className="grid-6">
            <KPI label="Requests" value="15,000" sub="100% of plan" />
            <KPI label="Success" value="14,946" sub="99.64%" />
            <KPI label="Failures" value="54" sub="0.36%" />
            <KPI label="Avg RPS" value="144" sub="peak 178" />
            <KPI label="Duration" value="4:12" unit="" sub="252,341 ms" />
            <KPI label="Avg latency" value="92" unit="ms" sub="min 18 · max 1.2s" />
          </div>

          {/* Percentiles + Status code donut */}
          <div className="grid responsive-split" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            <div className="card">
              <div className="card__head">
                <div className="card__title">Latency percentiles</div>
                <div className="dim mono" style={{ fontSize: 11 }}>vs. baseline (run_8ec1)</div>
              </div>
              <div className="card__body">
                <PercentileBars rows={[
                  { label: 'p50', value: 78,  color: 'var(--accent)' },
                  { label: 'p75', value: 112, color: 'var(--accent)' },
                  { label: 'p90', value: 168, color: 'var(--info)' },
                  { label: 'p95', value: 192, color: 'var(--info)' },
                  { label: 'p99', value: 211, color: 'var(--warn)' },
                  { label: 'max', value: 412, color: 'var(--err)' },
                ]}/>
              </div>
            </div>

            <div className="card">
              <div className="card__head">
                <div className="card__title">Status code distribution</div>
                <span className="dim mono" style={{ fontSize: 11 }}>6 distinct codes</span>
              </div>
              <div className="card__body">
                <div className="row" style={{ gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Donut data={AppData.statusCodes} size={150} thickness={24} />
                  <div className="donut__legend" style={{ flex: 1 }}>
                    {AppData.statusCodes.map((c) => (
                      <div key={c.code} className="donut__row">
                        <span className="sw" style={{ background: c.color }} />
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--fg-0)' }}>{c.code}</span>
                        <span className="dim" style={{ marginLeft: 6 }}>
                          {c.code.startsWith('2') ? 'OK' :
                           c.code.startsWith('3') ? 'Redirect' :
                           c.code === '404' ? 'Not Found' :
                           c.code === '500' ? 'Server Error' : 'Service Unavailable'}
                        </span>
                        <span className="mono" style={{ marginLeft: 'auto' }}>{c.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latency timeline */}
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Latency timeline</div>
                <div className="card__sub">Full run · 1s windows</div>
              </div>
              <div className="legend">
                <span><span className="legend__swatch" style={{ background: 'var(--accent)' }} />p50</span>
                <span><span className="legend__swatch" style={{ background: 'var(--info)' }} />p95</span>
                <span><span className="legend__swatch" style={{ background: 'var(--warn)' }} />p99</span>
              </div>
            </div>
            <div className="card__body">
              <LineChart
                series={[
                  { name: 'p50', color: 'var(--accent)', data: AppData.makeLatencySeries(80, 78, 18) },
                  { name: 'p95', color: 'var(--info)', data: AppData.makeLatencySeries(80, 192, 35) },
                  { name: 'p99', color: 'var(--warn)', data: AppData.makeLatencySeries(80, 211, 60) },
                ]}
                height={220}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'endpoints' && (
        <div className="card">
          <div className="card__head">
            <div className="card__title">Per-endpoint statistics</div>
            <span className="dim" style={{ fontSize: 11 }}>{AppData.completedEndpoints.length} endpoints</span>
          </div>
          <div className="card__body card__body--flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th className="right">Success</th>
                  <th className="right">Fail</th>
                  <th className="right">Avg</th>
                  <th className="right">p50</th>
                  <th className="right">p99</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {AppData.completedEndpoints.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Method>{e.method}</Method>
                        <span className="mono" style={{ fontSize: 11.5 }}>{e.path}</span>
                      </div>
                    </td>
                    <td className="right mono up">{e.success.toLocaleString()}</td>
                    <td className="right mono" style={{ color: e.fail > 10 ? 'var(--warn)' : 'var(--fg-1)' }}>{e.fail}</td>
                    <td className="right mono">{e.avg}<span className="dimmer"> ms</span></td>
                    <td className="right mono">{e.p50}<span className="dimmer"> ms</span></td>
                    <td className="right mono">{e.p99}<span className="dimmer"> ms</span></td>
                    <td style={{ width: 180 }}>
                      <Sparkline data={AppData.makeLatencySeries(24, e.avg, 30)} width={160} height={20} color="var(--accent)" fill={false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="card">
          <div className="card__head"><div className="card__title">All requests</div></div>
          <div className="card__body">
            <div className="empty">
              <div className="empty__title">15,000 requests captured</div>
              <p className="empty__sub">Full request log is available via export — too large to display inline.</p>
              <button className="btn"><Icon name="download" /> Download as JSONL</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="card">
          <div className="card__head"><div className="card__title">Configuration snapshot</div></div>
          <div className="card__body">
            <pre className="mono" style={{
              margin: 0, fontSize: 11.5, background: 'var(--bg-0)',
              border: '1px solid var(--line)', padding: 14, borderRadius: 4,
              color: 'var(--fg-1)', whiteSpace: 'pre-wrap', overflow: 'auto',
            }}>{`{
  "id": "cfg_04",
  "name": "Catalog v2 · regression",
  "concurrency": 25,
  "totalRequests": 15000,
  "timeout": 6000,
  "retries": 1,
  "endpoints": [
    { "method": "GET",  "url": "/api/v2/products",              "weight": 40 },
    { "method": "GET",  "url": "/api/v2/products/{id}",         "weight": 25 },
    { "method": "GET",  "url": "/api/v2/products/{id}/related", "weight": 15 },
    { "method": "POST", "url": "/api/v2/products/search",       "weight": 10 },
    { "method": "GET",  "url": "/api/v2/categories",            "weight":  7 },
    { "method": "POST", "url": "/api/v2/cart/preview",          "weight":  3 }
  ]
}`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================
   Compare runs
   ==================================================== */
function CompareScreen({ go }) {
  const runs = AppData.compareRuns;
  const colors = ['var(--fg-3)', 'var(--info)', 'var(--accent)'];

  return (
    <div className="page" data-screen-label="Compare">
      <PageHead
        title="Compare runs"
        sub={`${runs.length} runs selected · Search · sustained load`}
        actions={<>
          <button className="btn"><Icon name="plus" /> Add run</button>
          <button className="btn"><Icon name="download" /> Export comparison</button>
        </>}
      />

      <div className="stack">
        {/* Run row */}
        <div className="grid-3">
          {runs.map((r, i) => (
            <div key={r.id} className="card" style={{ borderLeft: `3px solid ${colors[i]}` }}>
              <div className="card__body">
                <div className="row" style={{ marginBottom: 6 }}>
                  <span className="mono dim" style={{ fontSize: 11 }}>{r.id}</span>
                  <span style={{ marginLeft: 'auto' }} className="tag">{r.date}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>{r.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div>
                    <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>RPS</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: colors[i] }}>{r.rps}</div>
                  </div>
                  <div>
                    <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>p99</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{r.p99}ms</div>
                  </div>
                  <div>
                    <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Errors</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{(r.errorRate * 100).toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Latency comparison</div>
            <div className="legend">
              {runs.map((r, i) => (
                <span key={r.id}><span className="legend__swatch" style={{ background: colors[i] }} />{r.label}</span>
              ))}
            </div>
          </div>
          <div className="card__body">
            <BarGroupChart
              groups={['p50', 'p95', 'p99']}
              series={runs.map((r, i) => ({
                name: r.label, color: colors[i],
                values: [r.p50, r.p95, r.p99],
              }))}
              height={260}
            />
          </div>
        </div>

        <div className="card">
          <div className="card__head"><div className="card__title">Detailed comparison</div></div>
          <div className="card__body card__body--flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Metric</th>
                  {runs.map((r, i) => (
                    <th key={r.id} className="right" style={{ color: colors[i] }}>{r.label}</th>
                  ))}
                  <th className="right">Δ baseline</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Requests', key: 'requests', fmt: (v) => v.toLocaleString() },
                  { label: 'Avg latency', key: 'avgLatency', fmt: (v) => v + ' ms' },
                  { label: 'p50', key: 'p50', fmt: (v) => v + ' ms' },
                  { label: 'p95', key: 'p95', fmt: (v) => v + ' ms' },
                  { label: 'p99', key: 'p99', fmt: (v) => v + ' ms' },
                  { label: 'Avg RPS', key: 'rps', fmt: (v) => v },
                  { label: 'Error rate', key: 'errorRate', fmt: (v) => (v * 100).toFixed(2) + '%' },
                ].map((m) => {
                  const baseline = runs[0][m.key];
                  const last = runs[runs.length - 1][m.key];
                  const diff = ((last - baseline) / baseline) * 100;
                  const better = m.key === 'rps' ? diff > 0 : diff < 0;
                  return (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 500 }}>{m.label}</td>
                      {runs.map((r, i) => (
                        <td key={r.id} className="right mono" style={{ color: i === runs.length - 1 ? colors[i] : 'var(--fg-1)' }}>
                          {m.fmt(r[m.key])}
                        </td>
                      ))}
                      <td className="right mono" style={{ color: better ? 'var(--ok)' : 'var(--err)' }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================
   New config
   ==================================================== */
function NewConfigScreen({ go }) {
  const [endpoints, setEndpoints] = useState([
    { method: 'GET', url: '/api/v2/products', weight: 40 },
    { method: 'GET', url: '/api/v2/products/{id}', weight: 25 },
  ]);

  return (
    <div className="page" data-screen-label="New Config" style={{ maxWidth: 920 }}>
      <PageHead
        title="New test configuration"
        sub="Define endpoints, load profile, and limits."
        actions={
          <>
            <button className="btn" onClick={() => go('configs')}>Cancel</button>
            <button className="btn btn--primary"><Icon name="plus" /> Save & run</button>
          </>
        }
      />

      <div className="stack">
        <div className="card">
          <div className="card__head"><div className="card__title">Basics</div></div>
          <div className="card__body stack-sm">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="e.g. Catalog v2 · regression" defaultValue="Catalog v2 · regression" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} placeholder="What you're testing and why" defaultValue="Compare catalog API against v1 baseline."/>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span className="tag">#regression</span>
              <span className="tag">#catalog</span>
              <button className="btn btn--ghost btn--sm" style={{ height: 22, padding: '0 6px' }}>
                <Icon name="plus" size={10} /> Add tag
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Endpoints</div>
              <div className="card__sub">Weights are distributed proportionally · {endpoints.length} configured</div>
            </div>
            <button className="btn btn--sm"
              onClick={() => setEndpoints([...endpoints, { method: 'GET', url: '', weight: 10 }])}>
              <Icon name="plus" size={11} /> Add endpoint
            </button>
          </div>
          <div className="card__body stack-sm">
            {endpoints.map((e, i) => (
              <div key={i} className="field-row" style={{ alignItems: 'center' }}>
                <select className="select" style={{ width: 96 }} defaultValue={e.method}>
                  {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input className="input" placeholder="/path/to/endpoint" defaultValue={e.url} />
                <div className="row" style={{ gap: 4, width: 80 }}>
                  <input className="input" defaultValue={e.weight} style={{ textAlign: 'right' }} />
                  <span className="dim mono" style={{ fontSize: 11 }}>%</span>
                </div>
                <button className="btn btn--ghost btn--sm"
                  onClick={() => setEndpoints(endpoints.filter((_, idx) => idx !== i))}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head"><div className="card__title">Load profile</div></div>
          <div className="card__body grid-4">
            {[
              { label: 'Concurrency', val: 25, sub: 'workers', mono: true },
              { label: 'Total requests', val: '15,000', sub: 'across all workers' },
              { label: 'Timeout', val: 6000, sub: 'ms per request' },
              { label: 'Retries', val: 1, sub: 'on transient error' },
            ].map((f) => (
              <div key={f.label}>
                <label className="label">{f.label}</label>
                <input className="input mono" defaultValue={f.val} />
                <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card__head"><div className="card__title">Advanced</div></div>
          <div className="card__body stack-sm">
            <div>
              <label className="label">Headers</label>
              <textarea className="textarea mono" rows={3} placeholder='{"Authorization":"Bearer ..."}'
                defaultValue={`{
  "Authorization": "Bearer $TOKEN",
  "X-Tenant": "acme-corp"
}`}/>
            </div>
            <div className="grid-2">
              <div>
                <label className="label">Environment</label>
                <select className="select"><option>staging</option><option>production</option><option>local</option></select>
              </div>
              <div>
                <label className="label">Ramp-up</label>
                <select className="select"><option>None (instant)</option><option>Linear · 30s</option><option>Linear · 60s</option><option>Step · 10s × 5</option></select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Screens2 = { RunLiveScreen, RunCompletedScreen, CompareScreen, NewConfigScreen };
