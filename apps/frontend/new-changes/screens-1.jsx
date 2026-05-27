/* All screens for the prototype. */
/* global React, Icon, Sparkline, KPI, RunStatus, Method, LineChart, BarGroupChart, Donut, PercentileBars, StatusStrip, AppData */

const { useEffect, useMemo, useRef, useState } = React;

/* ====================================================
   Page header
   ==================================================== */
function PageHead({ title, sub, actions }) {
  return (
    <div className="pagehead">
      <div>
        <h1 className="pagehead__title">{title}</h1>
        {sub && <div className="pagehead__sub">{sub}</div>}
      </div>
      {actions && <div className="pagehead__actions">{actions}</div>}
    </div>
  );
}

/* ====================================================
   Dashboard
   ==================================================== */
function DashboardScreen({ go }) {
  const { runs, sparks } = AppData;
  const recent = runs.slice(0, 6);

  return (
    <div className="page" data-screen-label="Dashboard">
      <PageHead
        title="Dashboard"
        sub="Performance baselines for the last 7 days · all environments"
        actions={
          <>
            <button className="btn"><Icon name="filter" /> Filter</button>
            <button className="btn btn--primary" onClick={() => go('configs/new')}>
              <Icon name="plus" /> New test
            </button>
          </>
        }
      />

      <div className="grid-4">
        <KPI label="Total runs (7d)" value="142" sub="vs. 118 prev." delta="20%" deltaDirection="up" spark={sparks.runs} sparkColor="var(--fg-2)" />
        <KPI label="Avg latency" value="168" unit="ms" sub="p99: 412 ms" delta="11%" deltaDirection="down" spark={sparks.latency} sparkColor="var(--info)" />
        <KPI label="Throughput" value="287" unit="rps" sub="peak 478" delta="8%" deltaDirection="up" spark={sparks.rps} sparkColor="var(--accent)" />
        <KPI label="Success rate" value="99.2" unit="%" sub="514 failures / 65k" delta="0.3pp" deltaDirection="down" spark={sparks.success} sparkColor="var(--ok)" />
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        <div className="grid responsive-split" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1.6fr 1fr' }}>
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Latency over time</div>
                <div className="card__sub">p50 / p95 / p99 across all runs · last 7 days</div>
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
                  { name: 'p50', color: 'var(--accent)', data: AppData.makeLatencySeries(60, 90, 30) },
                  { name: 'p95', color: 'var(--info)',   data: AppData.makeLatencySeries(60, 220, 60) },
                  { name: 'p99', color: 'var(--warn)',   data: AppData.makeLatencySeries(60, 350, 110) },
                ]}
                height={240}
              />
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Active configurations</div>
              <button className="btn btn--ghost btn--sm" onClick={() => go('configs')}>View all <Icon name="arrow" size={12} /></button>
            </div>
            <div className="card__body card__body--flush">
              {AppData.configs.slice(0, 5).map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < 4 ? '1px solid var(--line-soft)' : 0,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div className="dim mono" style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span>{c.concurrency} workers · {c.totalRequests.toLocaleString()} req</span>
                    </div>
                  </div>
                  <Sparkline data={AppData.makeLatencySeries(24, c.lastP99 / 2, 40)} width={60} height={22} color="var(--accent)" fill={false} />
                  <button className="btn btn--sm" onClick={() => go('runs/run_8f3a')}><Icon name="run" size={11} /> Run</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent runs */}
        <div className="card">
          <div className="card__head">
            <div className="card__title">Recent runs</div>
            <button className="btn btn--ghost btn--sm" onClick={() => go('runs')}>View all <Icon name="arrow" size={12} /></button>
          </div>
          <div className="card__body card__body--flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Configuration</th>
                  <th>Status</th>
                  <th className="right">Requests</th>
                  <th className="right">Avg</th>
                  <th className="right">p99</th>
                  <th className="right">RPS</th>
                  <th className="right">Errors</th>
                  <th>Started</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} onClick={() => go(`runs/${r.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="mono dim">{r.id}</td>
                    <td style={{ fontWeight: 500 }}>{r.config}</td>
                    <td><RunStatus status={r.status} /></td>
                    <td className="right mono">{r.requests.toLocaleString()}</td>
                    <td className="right mono">{r.avgLatency}<span className="dimmer"> ms</span></td>
                    <td className="right mono">{r.p99}<span className="dimmer"> ms</span></td>
                    <td className="right mono">{r.rps}</td>
                    <td className="right mono" style={{ color: r.errorRate > 0.02 ? 'var(--err)' : (r.errorRate > 0.005 ? 'var(--warn)' : 'var(--fg-1)') }}>
                      {(r.errorRate * 100).toFixed(2)}<span className="dimmer">%</span>
                    </td>
                    <td className="dim">{r.startedAt}</td>
                    <td className="right"><Icon name="chevron" className="dimmer" size={12} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================
   Configs list
   ==================================================== */
function ConfigsScreen({ go }) {
  const [filter, setFilter] = useState('');
  const list = AppData.configs.filter((c) =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.tags.some(t => t.includes(filter.toLowerCase()))
  );

  return (
    <div className="page" data-screen-label="Configs">
      <PageHead
        title="Test configurations"
        sub={`${AppData.configs.length} saved configurations`}
        actions={
          <>
            <div className="search" style={{ width: 200 }}>
              <Icon name="search" size={13} />
              <input placeholder="Filter by name or tag" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            <button className="btn btn--primary" onClick={() => go('configs/new')}><Icon name="plus" /> New config</button>
          </>
        }
      />

      <div className="grid-3" style={{ gap: 14 }}>
        {list.map((c) => (
          <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card__body" style={{ flex: 1, padding: 14 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="mono dim" style={{ fontSize: 11 }}>{c.id}</span>
                <span style={{ marginLeft: 'auto' }} className="pill mono">
                  <Icon name="history" size={11} /> {c.lastRun}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>{c.name}</div>
              <div className="dim" style={{ fontSize: 12, marginBottom: 14, lineHeight: 1.45 }}>{c.description}</div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8, marginBottom: 12,
                padding: '10px 0',
                borderTop: '1px dashed var(--line)',
                borderBottom: '1px dashed var(--line)',
              }}>
                <div>
                  <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Workers</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{c.concurrency}</div>
                </div>
                <div>
                  <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Requests</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{c.totalRequests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="dimmer" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Endpoints</div>
                  <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{c.endpoints}</div>
                </div>
              </div>

              <div className="row" style={{ flexWrap: 'wrap', gap: 5 }}>
                {c.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
              </div>
            </div>
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--line-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-0)',
            }}>
              <div className="dim" style={{ fontSize: 11 }}>
                Last p99 <span className="mono" style={{ color: 'var(--fg-1)' }}>{c.lastP99}ms</span>
                {' · '}
                <span className="mono" style={{ color: 'var(--fg-1)' }}>{c.lastRps} rps</span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn--ghost btn--sm" onClick={() => go(`configs/${c.id}`)}><Icon name="cog" size={12} /></button>
                <button className="btn btn--primary btn--sm" onClick={() => go('runs/run_8f3a')}><Icon name="run" size={11} /> Run</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================
   Runs list
   ==================================================== */
function RunsScreen({ go }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = statusFilter === 'all'
    ? AppData.runs
    : AppData.runs.filter(r => r.status === statusFilter);

  return (
    <div className="page" data-screen-label="Runs">
      <PageHead
        title="Test runs"
        sub={`${AppData.runs.length} runs across all environments`}
        actions={
          <>
            <div className="row" style={{
              background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4, padding: 2, gap: 0,
            }}>
              {['all', 'running', 'completed', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="btn btn--ghost btn--sm"
                  style={{
                    background: statusFilter === s ? 'var(--bg-3)' : 'transparent',
                    color: statusFilter === s ? 'var(--fg-0)' : 'var(--fg-2)',
                    textTransform: 'capitalize',
                    border: 'none',
                  }}
                >{s}</button>
              ))}
            </div>
            <button className="btn"><Icon name="download" /> Export</button>
          </>
        }
      />

      <div className="card">
        <div className="card__body card__body--flush">
          <table className="tbl">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Configuration</th>
                <th>Status</th>
                <th className="right">Requests</th>
                <th className="right">Avg</th>
                <th className="right">p50</th>
                <th className="right">p95</th>
                <th className="right">p99</th>
                <th className="right">RPS</th>
                <th className="right">Errors</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => go(`runs/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="mono dim">{r.id}</td>
                  <td style={{ fontWeight: 500 }}>{r.config}</td>
                  <td><RunStatus status={r.status} /></td>
                  <td className="right mono">{r.requests.toLocaleString()}</td>
                  <td className="right mono">{r.avgLatency}<span className="dimmer"> ms</span></td>
                  <td className="right mono">{Math.round(r.avgLatency * 0.75)}<span className="dimmer"> ms</span></td>
                  <td className="right mono">{Math.round(r.p99 * 0.78)}<span className="dimmer"> ms</span></td>
                  <td className="right mono">{r.p99}<span className="dimmer"> ms</span></td>
                  <td className="right mono">{r.rps}</td>
                  <td className="right mono" style={{ color: r.errorRate > 0.02 ? 'var(--err)' : (r.errorRate > 0.005 ? 'var(--warn)' : 'var(--fg-1)') }}>
                    {(r.errorRate * 100).toFixed(2)}<span className="dimmer">%</span>
                  </td>
                  <td className="dim">{r.startedAt}</td>
                  <td className="right"><Icon name="chevron" className="dimmer" size={12} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.Screens1 = { PageHead, DashboardScreen, ConfigsScreen, RunsScreen };
