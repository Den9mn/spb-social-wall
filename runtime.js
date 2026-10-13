/* SPB Social Wall — standalone runtime.
   Provides the small `dash` API the page code expects (data, calc, onData, params, links)
   and loads the snapshot data files listed in sources.json. */
(function () {
  const sources = {};
  const state = {};        // id -> {status, data, columns, message}
  const calcs = [];        // {id, inputs, fn, title, description}
  const listeners = [];
  let params = { vista: 'todo', dim: 'tier' };
  const defaults = { ...params };

  const notify = () => { for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } } };

  function runCalcs() {
    let progressed = true;
    const done = new Set(Object.keys(state).filter((k) => state[k].status === 'ok'));
    while (progressed) {
      progressed = false;
      for (const c of calcs) {
        if (done.has(c.id)) continue;
        if (!c.inputs.every((i) => done.has(i))) continue;
        try {
          const out = c.fn(...c.inputs.map((i) => state[i].data));
          state[c.id] = { status: 'ok', data: out, columns: Array.isArray(out) && out[0] ? Object.keys(out[0]) : [] };
        } catch (e) {
          console.error('calc ' + c.id, e);
          state[c.id] = { status: 'error', data: [], message: e.message };
        }
        done.add(c.id); progressed = true;
      }
    }
  }

  async function load() {
    try {
      const manifest = await fetch('sources.json').then((r) => r.json());
      Object.assign(sources, manifest);
      for (const id of Object.keys(manifest)) state[id] = { status: 'loading', data: [] };
      await Promise.all(Object.entries(manifest).map(async ([id, s]) => {
        try {
          const res = await fetch(s.file);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          if (s.file.endsWith('.json')) {
            const j = await res.json();
            const rows = Array.isArray(j) ? j : (j.rows || j.data || j.results || []);
            state[id] = { status: 'ok', data: rows, columns: rows[0] ? Object.keys(rows[0]) : [] };
          } else {
            const rows = d3.csvParse(await res.text());
            state[id] = { status: 'ok', data: rows, columns: rows.columns };
          }
        } catch (e) {
          state[id] = { status: 'error', data: [], message: e.message };
        }
      }));
      runCalcs();
    } catch (e) {
      console.error(e);
    }
    document.getElementById('dash-root')?.removeAttribute('data-dash-state');
    notify();
    renderSources();
  }

  function renderSources() {
    const box = document.getElementById('spb-sources');
    if (!box) return;
    const items = Object.entries(sources).sort((a, b) => a[1].title.localeCompare(b[1].title, 'es'));
    box.replaceChildren(...items.map(([id, s]) => {
      const d = document.createElement('details');
      const sm = document.createElement('summary'); sm.textContent = s.title;
      const p = document.createElement('p'); p.textContent = s.description;
      const a = document.createElement('a'); a.href = s.file; a.textContent = 'Descargar datos (' + s.file.split('/').pop() + ')'; a.setAttribute('download', '');
      d.append(sm, p, a); return d;
    }));
  }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(notify, 150); });

  window.dash = {
    data(id) {
      const s = state[id];
      if (!s) return { status: calcs.some((c) => c.id === id) || !Object.keys(sources).length ? 'loading' : 'missing', data: [], columns: [], meta: [] };
      return { status: s.status, data: s.data, rows: s.data, columns: s.columns || [], message: s.message, meta: [], refreshing: false };
    },
    calc(id, def) { calcs.push({ id, ...def }); },
    loader() {},
    onData(fn) { listeners.push(fn); try { fn(); } catch (e) { console.error(e); } },
    params() { return { ...params }; },
    setParams(p) { params = { ...params, ...p }; notify(); },
    resetParams() { params = { ...defaults }; notify(); },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) {} },
    refresh() {},
    colors: ['#EC0000', '#6B7A8F', '#2E86AB', '#F18F01', '#3B8E5A', '#8E5A9B', '#C2873C', '#5C5C5C'],
  };

  document.getElementById('dash-root')?.setAttribute('data-dash-state', 'loading');
  load();
})();
