/* App shell: sidebar + topbar + router */
/* global React, ReactDOM, Icon, Screens1, Screens2, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSlider */

const { useEffect, useMemo, useRef, useState } = React;
const { DashboardScreen, ConfigsScreen, RunsScreen } = Screens1;
const { RunLiveScreen, RunCompletedScreen, CompareScreen, NewConfigScreen } = Screens2;

/* ====================================================
   Sidebar
   ==================================================== */
function Sidebar({ route, go, collapsed }) {
  const sections = [
    {
      label: 'WORKSPACE',
      items: [
        { route: 'dashboard', icon: 'home',  label: 'Dashboard' },
        { route: 'configs',   icon: 'cog',   label: 'Configurations', count: 6 },
        { route: 'runs',      icon: 'run',   label: 'Test runs',      count: 142 },
        { route: 'compare',   icon: 'cmp',   label: 'Compare' },
      ],
    },
    {
      label: 'DATA',
      items: [
        { route: 'import',  icon: 'up',     label: 'Import OpenAPI' },
        { route: 'sources', icon: 'globe',  label: 'Environments' },
        { route: 'history', icon: 'history',label: 'Run history' },
      ],
    },
  ];

  return (
    <aside className="side">
      <div className="side__brand">
        <div className="side__mark">P</div>
        {!collapsed && <span>PerfTester</span>}
      </div>

      <div style={{ padding: '12px 12px 4px' }}>
        <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => go('configs/new')}>
          <Icon name="plus" /> {!collapsed && 'New test'}
        </button>
      </div>

      {sections.map((s) => (
        <div key={s.label}>
          {!collapsed && <div className="side__section">{s.label}</div>}
          <nav className="side__nav">
            {s.items.map((it) => {
              const isActive = route === it.route || (it.route !== 'dashboard' && route.startsWith(it.route));
              return (
                <div
                  key={it.route}
                  className={'side__item ' + (isActive ? 'is-active' : '')}
                  onClick={() => go(it.route)}
                >
                  <Icon name={it.icon} className="ico" size={14} />
                  {!collapsed && (
                    <>
                      <span>{it.label}</span>
                      {it.count != null && <span className="side__count num">{it.count}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      ))}

      {!collapsed && (
        <div className="side__footer">
          <div style={{
            width: 24, height: 24, borderRadius: 4,
            background: 'var(--bg-3)', display: 'grid', placeItems: 'center',
            color: 'var(--fg-0)', fontWeight: 600, fontSize: 11,
          }}>JR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--fg-0)', fontSize: 12, fontWeight: 500 }}>Jordan R.</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>acme · staging</div>
          </div>
          <Icon name="cog" className="dim" size={13} />
        </div>
      )}
    </aside>
  );
}

/* ====================================================
   Topbar with breadcrumb
   ==================================================== */
function Topbar({ route, go, onMenu }) {
  const crumbs = useMemo(() => {
    const parts = route.split('/').filter(Boolean);
    const map = {
      dashboard: 'Dashboard',
      configs: 'Configurations',
      runs: 'Test runs',
      compare: 'Compare',
      new: 'New',
      import: 'Import',
      sources: 'Environments',
      history: 'History',
    };
    if (parts[0] === 'configs' && parts[1] === 'new') return [{ label: 'Configurations', go: 'configs' }, { label: 'New', leaf: true }];
    if (parts[0] === 'runs' && parts[1]) return [{ label: 'Test runs', go: 'runs' }, { label: parts[1], leaf: true, mono: true }];
    return parts.map((p, i) => ({
      label: map[p] || p,
      go: parts.slice(0, i + 1).join('/'),
      leaf: i === parts.length - 1,
    }));
  }, [route]);

  return (
    <header className="topbar">
      <button className="iconbtn hamburger" onClick={onMenu} aria-label="Open menu">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb__sep">/</span>}
            {c.leaf
              ? <span className={'crumb__leaf ' + (c.mono ? 'mono' : '')}>{c.label}</span>
              : <span className="crumb__root" onClick={() => go(c.go)}>{c.label}</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__search-wrap">
        <div className="search">
          <Icon name="search" size={13} />
          <input placeholder="Search runs, configs, endpoints…" />
          <kbd>⌘K</kbd>
        </div>
      </div>

      <div className="topbar__conn-wrap">
        <div className="conn">
          <span className="dot" />
          <span>Live</span>
          <span className="dimmer mono">api.acme.dev</span>
        </div>
      </div>

      <button className="iconbtn"><Icon name="bell" size={14} /></button>
      <button className="iconbtn"><Icon name="sun" size={14} /></button>
    </header>
  );
}

/* ====================================================
   Tweaks panel
   ==================================================== */
function PerfTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Appearance" />
      <TweakRadio label="Theme" value={tweaks.theme} options={['dark', 'light']}
        onChange={(v) => setTweak('theme', v)} />
      <TweakRadio label="Density" value={tweaks.density} options={['compact', 'default', 'comfy']}
        onChange={(v) => setTweak('density', v)} />

      <TweakSection label="Accent" />
      <TweakColor label="Accent color" value={tweaks.accent}
        options={[
          '#c6f02a',  // electric lime (default-ish hex form)
          '#3a8dff',  // saturated blue
          '#ff7a3a',  // saturated orange
          '#b87aff',  // saturated purple
          '#3ad8d8',  // cyan
        ]}
        onChange={(v) => setTweak('accent', v)} />
    </TweaksPanel>
  );
}

/* ====================================================
   App
   ==================================================== */
function App() {
  const [route, setRoute] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "dark",
    "density": "default",
    "accent": "#c6f02a"
  }/*EDITMODE-END*/);

  // Apply theme + density on root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    document.documentElement.setAttribute('data-density', tweaks.density);
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks]);

  const go = (r) => {
    setRoute(r);
    setMobileOpen(false);
  };

  let screen = null;
  if (route === 'dashboard') screen = <DashboardScreen go={go} />;
  else if (route === 'configs') screen = <ConfigsScreen go={go} />;
  else if (route === 'configs/new') screen = <NewConfigScreen go={go} />;
  else if (route === 'configs/cfg_04') screen = <NewConfigScreen go={go} />;
  else if (route === 'runs') screen = <RunsScreen go={go} />;
  else if (route === 'runs/run_8f3a') screen = <RunLiveScreen go={go} runId="run_8f3a" />;
  else if (route.startsWith('runs/')) screen = <RunCompletedScreen go={go} />;
  else if (route === 'compare') screen = <CompareScreen go={go} />;
  else screen = <DashboardScreen go={go} />;

  return (
    <div className={'app ' + (collapsed ? 'app--collapsed ' : '') + (mobileOpen ? 'is-mobile-open' : '')}>
      <Sidebar route={route} go={go} collapsed={collapsed} />
      <div className="scrim" onClick={() => setMobileOpen(false)} />
      <div className="main">
        <Topbar route={route} go={go} onMenu={() => setMobileOpen(true)} />
        <div className="scroll">
          <div key={route}>{screen}</div>
        </div>
      </div>
      <PerfTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
