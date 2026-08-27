import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function prettyStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return { label: "Delivered", cls: "st-delivered" };
  if (s === "SHIPPED" || s === "IN_TRANSIT") return { label: "Shipped", cls: "st-shipped" };
  if (s === "CANCELLED") return { label: "Cancelled", cls: "st-cancelled" };
  return { label: "Processing", cls: "st-processing" };
}

function clockLabel(date) {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${day} • ${time}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function useCountdown(iso) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return { days: 0, hours: 0, mins: 0, secs: 0 };
  const diff = Math.max(0, new Date(iso).getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

function SalesChart({ series, todayKes }) {
  const w = 640;
  const h = 220;
  const padL = 8;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const n = series.length || 1;
  const max = Math.max(...series.map((d) => d.totalKes), 1);
  const pts = series.map((d, i) => {
    const x = padL + (n === 1 ? 0 : (i * (w - padL - padR)) / (n - 1));
    const y = padT + (1 - d.totalKes / max) * (h - padT - padB);
    return { ...d, x, y };
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = last
    ? `${line} L${last.x.toFixed(1)},${h - padB} L${pts[0].x.toFixed(1)},${h - padB} Z`
    : "";
  const labelEvery = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="sales-wrap">
      {last && (
        <div className="chart-tip-html">
          {kes(todayKes ?? last.totalKes)} <span>Today</span>
        </div>
      )}
      <svg className="sales-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#salesFill)" />
        <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
        {pts.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={p.date} x={p.x} y={h - 8} textAnchor="middle" className="chart-label">
              {p.date.slice(5)}
            </text>
          ) : null
        )}
        {last && <circle cx={last.x} cy={last.y} r="5" fill="#6D28D9" stroke="#fff" strokeWidth="2" />}
      </svg>
    </div>
  );
}

function Donut({ status }) {
  const parts = [
    { key: "delivered", color: "#16A34A", label: "Delivered" },
    { key: "processing", color: "#F97316", label: "Processing" },
    { key: "shipped", color: "#2563EB", label: "Shipped" },
    { key: "cancelled", color: "#DC2626", label: "Cancelled" },
  ];
  const total = status.total || parts.reduce((s, p) => s + (status[p.key] || 0), 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {parts.map((p) => {
          const value = status[p.key] || 0;
          const len = total ? (value / total) * c : 0;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={p.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="donut-total">
          {fmtNum(total)}
        </text>
        <text x="70" y="84" textAnchor="middle" className="donut-sub">
          Total
        </text>
      </svg>
      <ul className="donut-legend">
        {parts.map((p) => {
          const value = status[p.key] || 0;
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <li key={p.key}>
              <i style={{ background: p.color }} />
              <span>
                {p.label} {pct}%
              </span>
              <b>({fmtNum(value)})</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const KPIS = [
  { key: "todaysSalesKes", label: "Total Sales Today", icon: "bag", tone: "purple", money: true, change: "salesChangePct" },
  { key: "ordersToday", label: "Orders Today", icon: "receipt", tone: "green", change: "ordersChangePct" },
  { key: "activeCustomers", label: "Active Customers", icon: "users", tone: "blue", change: "customersChangePct" },
  { key: "pointsIssued", label: "NETZA Points Issued", icon: "star", tone: "orange", change: "pointsChangePct" },
  { key: "flashDropSalesKes", label: "Flash Drop Sales", icon: "bolt", tone: "red", money: true, change: "flashDropSalesChangePct" },
];

const SHORTCUTS = [
  { to: "/products", icon: "box", label: "Manage Products" },
  { to: "/customers", icon: "users", label: "Manage Customers" },
  { to: "/points", icon: "star", label: "Points & Rewards" },
  { to: "/competitions", icon: "trophy", label: "Competitions" },
  { to: "/flash-drops", icon: "bolt", label: "Flash Drop" },
  { to: "/reports", icon: "chart", label: "Reports" },
  { to: "/settings", icon: "gear", label: "Settings" },
];

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState(7);
  const [now, setNow] = useState(() => new Date());
  const countdown = useCountdown(data?.nextFlashDrop?.endsAt);

  useEffect(() => {
    api("/admin/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const series = useMemo(() => {
    const rows = data?.salesByDay || [];
    return rows.slice(-range);
  }, [data, range]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading dashboard…</p>;
  const k = data.kpis;

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h1>
            <span className="dash-home">
              <Icon name="home" size={18} />
            </span>
            Dashboard
          </h1>
          <p>Welcome back, Admin. Here&apos;s what&apos;s happening with NETZA Kenya.</p>
        </div>
        <div className="dash-head-meta">
          <div className="time-pill">{clockLabel(now)}</div>
          <div className="online-pill">
            <i /> System Online
          </div>
        </div>
      </div>

      <section className="kpi-row">
        {KPIS.map((item) => {
          const change = k[item.change] || 0;
          const up = change >= 0;
          return (
            <article key={item.key} className="kpi-card">
              <div className={`kpi-icon ${item.tone}`}>
                <Icon name={item.icon} size={18} />
              </div>
              <div className="kpi-label">{item.label}</div>
              <div className="kpi-value">{item.money ? kes(k[item.key]) : fmtNum(k[item.key])}</div>
              <div className={`kpi-change ${up ? "up" : "down"}`}>
                {up ? "↑" : "↓"} {Math.abs(change)}% vs yesterday
              </div>
            </article>
          );
        })}
      </section>

      <section className="dash-mid">
        <article className="card dash-sales">
          <div className="card-head">
            <h2>Sales Overview</h2>
            <div className="range-tabs">
              {[7, 30, 90].map((d) => (
                <button key={d} className={range === d ? "on" : ""} type="button" onClick={() => setRange(d)}>
                  {d} Days
                </button>
              ))}
            </div>
          </div>
          <SalesChart series={series} todayKes={k.todaysSalesKes} />
        </article>
        <article className="card">
          <div className="card-head">
            <h2>Order Status</h2>
          </div>
          <Donut status={data.orderStatus || {}} />
        </article>
        <article className="card">
          <div className="card-head">
            <h2>
              <Icon name="alert" size={16} /> Low Stock Alert
            </h2>
            <Link to="/products" className="view-all">
              View All
            </Link>
          </div>
          <ul className="stock-list">
            {data.lowStockProducts.map((p) => (
              <li key={p.id}>
                {p.image ? <img src={p.image} alt="" /> : <div className="stock-ph" />}
                <div>
                  <div className="stock-name">{p.name}</div>
                  <div className="muted">{p.sku}</div>
                </div>
                <span className="stock-badge">Stock: {p.stock}</span>
              </li>
            ))}
            {data.lowStockProducts.length === 0 && <li className="muted">Inventory looks healthy.</li>}
          </ul>
        </article>
      </section>

      <section className="dash-bottom">
        <article className="card">
          <div className="card-head">
            <h2>Recent Orders</h2>
            <Link to="/orders" className="view-all">
              View All
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => {
                const st = prettyStatus(o.status);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orders/${o.id}`}>{o.orderNumber}</Link>
                    </td>
                    <td>{o.customer}</td>
                    <td>{o.itemCount}</td>
                    <td>{kes(o.totalKes)}</td>
                    <td>
                      <span className={`st-badge ${st.cls}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted">
                    No orders yet. They will appear after a customer checkout.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="card flash-card">
          <div className="card-head">
            <h2>Flash Drop Management</h2>
          </div>
          <div className="flash-gift">
            <Icon name="gift" size={28} />
          </div>
          <div className="muted" style={{ textAlign: "center" }}>
            Next Flash Drop
          </div>
          <div className="flash-name">{data.nextFlashDrop?.name || "No drop scheduled"}</div>
          <div className="countdown">
            {[
              [countdown.days, "Days"],
              [countdown.hours, "Hrs"],
              [countdown.mins, "Mins"],
              [countdown.secs, "Secs"],
            ].map(([v, label], i) => (
              <div key={label} className="count-box">
                {i > 0 && <span className="count-colon">:</span>}
                <div>
                  <b>{pad(v)}</b>
                  <small>{label}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="muted" style={{ textAlign: "center", marginTop: 8 }}>
            Selected Products: {fmtNum(data.nextFlashDrop?.productCount || 0)}
          </div>
          <Link to="/flash-drops" className="btn btn-purple">
            Manage Flash Drop
          </Link>
        </article>

        <article className="card">
          <div className="card-head">
            <h2>Competition Leaderboard</h2>
          </div>
          <ol className="board">
            {data.leaderboard.map((row) => (
              <li key={row.rank}>
                <span className={`rank r${row.rank}`}>{row.rank <= 3 ? ["🏆", "🥈", "🥉"][row.rank - 1] : row.rank}</span>
                <div>
                  <div className="board-name">{row.name}</div>
                  <div className="muted">{fmtNum(row.points)} pts</div>
                </div>
              </li>
            ))}
            {data.leaderboard.length === 0 && <li className="muted">No customer points yet.</li>}
          </ol>
        </article>
      </section>

      <section className="shortcut-row">
        {SHORTCUTS.map((s) => (
          <Link key={s.to} to={s.to} className="shortcut">
            <Icon name={s.icon} size={18} />
            {s.label}
          </Link>
        ))}
      </section>

      <footer className="dash-foot">
        <span>© 2026 NETZA Kenya. All rights reserved.</span>
        <span className="powered">
          <Icon name="cart" size={14} /> Powered by NETZA E-Commerce Platform
        </span>
      </footer>
    </div>
  );
}
