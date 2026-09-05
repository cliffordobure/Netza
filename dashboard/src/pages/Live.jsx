import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Icon } from "../icons";
import { useAutoRefresh } from "../useAutoRefresh";

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
}

function ago(ts) {
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

function prettyPath(path, client) {
  const p = String(path || "/").split("?")[0] || "/";
  const q = String(path || "").includes("?") ? String(path).slice(String(path).indexOf("?")) : "";
  if (client === "dashboard") {
    if (p === "/") return "Dashboard";
    if (p.startsWith("/live")) return "Live monitor";
    if (p.startsWith("/products/categories")) return "Categories";
    if (p.startsWith("/products/brands")) return "Brands";
    if (p.startsWith("/products/new")) return "Add product";
    if (p.startsWith("/products/") && p !== "/products") return "Product editor";
    if (p.startsWith("/products")) return "Products";
    if (p.startsWith("/orders/") && p !== "/orders") return "Order detail";
    if (p.startsWith("/orders")) return "Orders";
    if (p.startsWith("/customers/") && p !== "/customers") return "Customer profile";
    if (p.startsWith("/customers")) return "Customers";
    if (p.startsWith("/flash-drops")) return "Flash drops";
    if (p.startsWith("/points")) return "Points & rewards";
    if (p.startsWith("/competitions")) return "Competitions";
    if (p.startsWith("/delivery")) return "Delivery";
    if (p.startsWith("/payments")) return "Payments";
    if (p.startsWith("/reports")) return "Reports";
    if (p.startsWith("/marketing")) return "Marketing";
    if (p.startsWith("/support")) return "Support";
    if (p.startsWith("/settings")) return "Settings";
    return p.slice(1) || "Dashboard";
  }
  if (p === "/") return "Home";
  if (p.startsWith("/shop")) return "Categories";
  if (p.startsWith("/catalog")) return q.includes("q=") ? "Search" : "Catalog";
  if (p.startsWith("/product/")) return "Product";
  if (p.startsWith("/cart")) return "Cart";
  if (p.startsWith("/checkout")) return "Checkout";
  if (p.startsWith("/order/")) return "Order";
  if (p.startsWith("/orders")) return "My orders";
  if (p.startsWith("/points")) return "Points";
  if (p.startsWith("/flash")) return "Flash drop";
  if (p.startsWith("/challenges")) return "Challenges";
  if (p.startsWith("/quotes")) return "Quotes";
  if (p.startsWith("/account")) return "Account";
  if (p.startsWith("/login")) return "Sign in";
  if (p.startsWith("/register")) return "Register";
  return p.slice(1) || "Home";
}

function Sparkline({ series, color = "#6D28D9", fillId, unit = "", maxHint }) {
  const w = 640;
  const h = 180;
  const padL = 8;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const n = series.length || 1;
  const values = series.map((d) => Number(d.v) || 0);
  const max = Math.max(maxHint || 0, ...values, 1);
  const pts = values.map((v, i) => {
    const x = padL + (n === 1 ? 0 : (i * (w - padL - padR)) / (n - 1));
    const y = padT + (1 - v / max) * (h - padT - padB);
    return { x, y, v, t: series[i]?.t };
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = last
    ? `${line} L${last.x.toFixed(1)},${h - padB} L${pts[0].x.toFixed(1)},${h - padB} Z`
    : "";
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="sales-wrap">
      {last && (
        <div className="chart-tip-html">
          {fmtNum(last.v, last.v % 1 ? 1 : 0)}
          {unit} <span>now</span>
        </div>
      )}
      <svg className="sales-svg live-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${fillId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" />
        {pts.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={`${p.t || i}`} x={p.x} y={h - 8} textAnchor="middle" className="chart-label">
              {p.t ? new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </text>
          ) : null
        )}
        {last && <circle cx={last.x} cy={last.y} r="5" fill={color} stroke="#fff" strokeWidth="2" />}
      </svg>
    </div>
  );
}

const KPIS = [
  { key: "people", label: "People online", icon: "users", tone: "purple" },
  { key: "customers", label: "In the app", icon: "cart", tone: "blue" },
  { key: "staff", label: "On dashboard", icon: "eye", tone: "green" },
  { key: "cpu", label: "CPU now", icon: "bolt", tone: "orange", suffix: "%" },
  { key: "rpm", label: "Requests / min", icon: "activity", tone: "red" },
];

export default function Live() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function load() {
    api("/admin/live")
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load live monitor."));
  }

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 4000);

  const series = useMemo(() => {
    const rows = data?.history || [];
    return {
      cpu: rows.map((r) => ({ t: r.t, v: r.cpuPct })),
      mem: rows.map((r) => ({ t: r.t, v: r.rssPct ?? r.memPct })),
      rpm: rows.map((r) => ({ t: r.t, v: r.rpm })),
      people: rows.map((r) => ({ t: r.t, v: r.people })),
    };
  }, [data]);

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading live monitor…</p>;

  const people = data.people || {};
  const host = data.host || {};
  const scale = data.scale || {};
  const sessions = people.sessions || [];
  const routes = people.routes || [];
  const maxRoute = Math.max(1, ...routes.map((r) => r.count));
  const kpiVals = {
    people: people.total || 0,
    customers: people.mobile || people.customers || 0,
    staff: people.dashboard || people.staff || 0,
    cpu: host.cpuPct || 0,
    rpm: data.traffic?.rpm || 0,
  };

  return (
    <div className="dash live-page">
      <div className="dash-head">
        <div>
          <h1>
            <span className="dash-home">
              <Icon name="activity" size={18} />
            </span>
            Live
          </h1>
          <p>Who is in the store right now, where they are, and how hard this server is working.</p>
        </div>
        <div className="dash-head-meta">
          <div className="online-pill">
            <i /> {people.total || 0} online
          </div>
          <div className={`live-scale-pill ${scale.level || "ok"}`}>
            {scale.level === "warn" ? "Scale soon" : scale.level === "watch" ? "Watch load" : "Capacity OK"}
          </div>
        </div>
      </div>

      <section className="kpi-row live-kpis">
        {KPIS.map((item) => (
          <article key={item.key} className="kpi-card">
            <div className={`kpi-icon ${item.tone}`}>
              <Icon name={item.icon} size={18} />
            </div>
            <div className="kpi-label">{item.label}</div>
            <div className="kpi-value">
              {fmtNum(kpiVals[item.key], item.key === "cpu" && kpiVals.cpu % 1 ? 1 : 0)}
              {item.suffix || ""}
            </div>
          </article>
        ))}
      </section>

      <section className={`live-hints ${scale.level || "ok"}`}>
        {(scale.hints || []).map((hint) => (
          <p key={hint}>{hint}</p>
        ))}
        <span>
          This instance: {host.cores || 1} CPU · {fmtNum(host.totalMemMb)} MB RAM · API using {fmtNum(host.rssMb)} MB
          {host.loadAvg ? ` · load ${host.loadAvg.join(" / ")}` : ""}
        </span>
      </section>

      <section className="live-charts">
        <article className="card">
          <div className="card-head">
            <h2>CPU power</h2>
          </div>
          <Sparkline series={series.cpu} color="#F97316" fillId="liveCpuFill" unit="%" maxHint={100} />
        </article>
        <article className="card">
          <div className="card-head">
            <h2>API memory</h2>
          </div>
          <Sparkline series={series.mem} color="#2563EB" fillId="liveMemFill" unit="%" maxHint={100} />
        </article>
        <article className="card">
          <div className="card-head">
            <h2>Backend requests</h2>
          </div>
          <Sparkline series={series.rpm} color="#E11D48" fillId="liveRpmFill" unit="/min" />
        </article>
      </section>

      <section className="live-bottom">
        <article className="card">
          <div className="card-head">
            <h2>Where people are</h2>
          </div>
          {routes.length === 0 ? (
            <p className="muted">No active sessions yet. Open the app or another admin tab to see movement.</p>
          ) : (
            <ul className="live-routes">
              {routes.map((r) => (
                <li key={`${r.client}-${r.path}`}>
                  <div>
                    <b>{prettyPath(r.path, r.client)}</b>
                    <span>
                      {r.client === "dashboard" ? "Dashboard" : "App"} · {r.path}
                    </span>
                  </div>
                  <div className="live-route-bar">
                    <i style={{ width: `${Math.max(8, (r.count / maxRoute) * 100)}%` }} />
                  </div>
                  <em>{r.count}</em>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <div className="card-head">
            <h2>People in the system</h2>
            <span className="muted">{sessions.length} active</span>
          </div>
          {sessions.length === 0 ? (
            <p className="muted">Waiting for heartbeats from the app and this dashboard.</p>
          ) : (
            <div className="live-table-wrap">
              <table className="live-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Client</th>
                    <th>Now on</th>
                    <th>Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.sessionId}>
                      <td>
                        <b>{s.name}</b>
                        <span className="muted">{s.role?.replaceAll("_", " ") || "Customer"}</span>
                      </td>
                      <td>{s.client === "dashboard" ? "Dashboard" : "Mobile app"}</td>
                      <td>
                        <b>{prettyPath(s.path, s.client)}</b>
                        <span className="muted">{s.path}</span>
                      </td>
                      <td>{ago(s.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
