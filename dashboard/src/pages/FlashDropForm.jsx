import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const C6_IMG = "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=800&q=80&sig=1";

const CATEGORIES = ["Networking", "CCTV", "Vouchers", "Gadgets", "Access Control", "Cabling", "Power"];

const TYPES = [
  { id: "percentage", label: "Percentage Discount" },
  { id: "fixed", label: "Fixed Price" },
  { id: "voucher", label: "Voucher Drop" },
];

const C6 = {
  id: "c6-demo",
  name: "TP-Link Archer C6 Router",
  sku: "TL-ARCH-C6",
  priceKes: 6500,
  image: C6_IMG,
};

function emptyForm() {
  return {
    name: "TP-Link Archer C6 Router Flash Drop",
    category: "Networking",
    type: "percentage",
    description: "High performance dual-band router at a huge discount. Limited units!",
    status: "upcoming",
    product: C6,
    originalKes: 6500,
    discount: 40,
    stock: 200,
    maxQty: 2,
    reserved: 10,
    startsAt: "2026-05-27T10:00",
    endsAt: "2026-05-27T12:00",
    showCountdown: true,
    allowBackorders: true,
    requirePoints: false,
    notify: true,
    bonusPoints: 200,
    tags: ["Flash Drop", "Networking"],
  };
}

function kes2(n) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function fmtLabel(value) {
  if (!value) return "—";
  const [date, time] = String(value).split("T");
  if (!date || !time) return value;
  const [y, m, d] = date.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [hh, mm] = time.split(":");
  const h = Number(hh);
  const h12 = h % 12 || 12;
  const am = h >= 12 ? "PM" : "AM";
  return `${Number(d)} ${months[Number(m) - 1]} ${y}, ${String(h12).padStart(2, "0")}:${mm} ${am}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function durationParts(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return { hours: 0, mins: 0, ms: 0 };
  const ms = Math.max(0, b.getTime() - a.getTime());
  return { hours: Math.floor(ms / 3600000), mins: Math.floor((ms % 3600000) / 60000), ms };
}

function Switch({ on, onClick }) {
  return (
    <button className={`pts-switch ${on ? "on" : ""}`} type="button" onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="card pf-card fdf-sec">
      <h2>
        <span className="fdf-num">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function FlashDropForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [picker, setPicker] = useState(false);
  const [pq, setPq] = useState("");
  const [catalog, setCatalog] = useState([C6]);
  const [now, setNow] = useState(() => Date.now());
  const [seedStart] = useState(() => Date.now() + ((1 * 86400 + 23 * 3600 + 45 * 60 + 10) * 1000));

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    api("/admin/products?limit=50")
      .then((d) => {
        const rows = (d.products || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          priceKes: p.priceKes,
          image: p.images?.[0]?.url || p.imageUrl || C6_IMG,
        }));
        const hasC6 = rows.some((p) => /archer c6/i.test(p.name) || p.sku === "TL-ARCH-C6");
        setCatalog(hasC6 ? rows : [C6, ...rows]);
      })
      .catch(() => setCatalog([C6]));
  }, []);

  useEffect(() => {
    if (isNew) {
      const next = emptyForm();
      if (params.get("schedule") === "1") next.status = "upcoming";
      setForm(next);
      return;
    }
    api(`/admin/flash-drops/${id}`)
      .then(({ drop }) => {
        setForm({
          ...emptyForm(),
          name: drop.name || "",
          category: drop.category || "Networking",
          type: drop.type || "percentage",
          description: drop.description || "",
          status: drop.status === "live" ? "live" : "upcoming",
          product: {
            id: drop.productId || drop.id,
            name: drop.productName || drop.name,
            sku: drop.productSku || drop.sku,
            priceKes: drop.originalKes || 0,
            image: drop.image || C6_IMG,
          },
          originalKes: drop.originalKes || 0,
          discount: drop.discount || 0,
          stock: drop.stock || 0,
          maxQty: drop.maxQty || 1,
          reserved: drop.reserved || 0,
          startsAt: "2026-05-27T10:00",
          endsAt: "2026-05-27T12:00",
          showCountdown: drop.showCountdown !== false,
          allowBackorders: drop.allowBackorders !== false,
          requirePoints: Boolean(drop.requirePoints),
          notify: drop.notify !== false,
          bonusPoints: drop.bonusPoints || 0,
          tags: drop.tags?.length ? drop.tags : ["Flash Drop", drop.category].filter(Boolean),
        });
      })
      .catch((err) => setError(err.message || "Could not load flash drop."));
  }, [id, isNew, params]);

  const flashKes = useMemo(() => {
    const orig = Number(form.originalKes || 0);
    const d = Number(form.discount || 0);
    if (form.type === "fixed") return Math.max(0, orig - d);
    if (form.type === "voucher") return orig;
    return Math.max(0, Math.round(orig * (1 - d / 100) * 100) / 100);
  }, [form.originalKes, form.discount, form.type]);

  const saveAmt = Math.max(0, Number(form.originalKes || 0) - flashKes);
  const savePct = Number(form.originalKes) ? Math.round((saveAmt / Number(form.originalKes)) * 100) : (form.discount || 0);
  const dur = durationParts(form.startsAt, form.endsAt);

  const countdown = useMemo(() => {
    const start = new Date(form.startsAt).getTime();
    const target = Number.isNaN(start) || start <= now ? seedStart : start;
    const diff = Math.max(0, target - now);
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  }, [form.startsAt, now, seedStart]);

  function pickProduct(p) {
    setForm((f) => ({
      ...f,
      product: p,
      originalKes: p.priceKes || f.originalKes,
      name: f.name?.includes("Flash Drop") ? `${p.name} Flash Drop` : p.name,
    }));
    setPicker(false);
    setPq("");
  }

  function addTag(raw) {
    const t = String(raw || "").trim();
    if (!t || form.tags.includes(t)) return;
    set("tags", [...form.tags, t]);
    setTagDraft("");
  }

  function payload(extra = {}) {
    return {
      name: form.name,
      category: form.category,
      type: form.type,
      description: form.description,
      status: extra.status || form.status,
      discount: Number(form.discount || 0),
      stock: Number(form.stock || 0),
      originalKes: Number(form.originalKes || 0),
      flashKes,
      maxQty: Number(form.maxQty || 1),
      reserved: Number(form.reserved || 0),
      productSku: form.product?.sku || "",
      productName: form.product?.name || "",
      productId: form.product?.id && form.product.id !== "c6-demo" ? form.product.id : "",
      image: form.product?.image || C6_IMG,
      showCountdown: form.showCountdown,
      allowBackorders: form.allowBackorders,
      requirePoints: form.requirePoints,
      notify: form.notify,
      bonusPoints: Number(form.bonusPoints || 0),
      tags: form.tags,
      startLabel: fmtLabel(form.startsAt),
      endLabel: fmtLabel(form.endsAt),
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      isDraft: Boolean(extra.isDraft),
      ...extra,
    };
  }

  async function submit(kind) {
    setBusy(true);
    setError("");
    try {
      const extra = kind === "draft"
        ? { isDraft: true, status: "upcoming" }
        : { isDraft: false, status: form.status === "live" ? "live" : "upcoming" };
      if (extra.status === "live") {
        extra.endsAtIso = new Date(Date.now() + Math.max(dur.ms, 30 * 60 * 1000)).toISOString();
      }
      const body = payload(extra);
      if (id) await api(`/admin/flash-drops/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/admin/flash-drops", { method: "POST", body: JSON.stringify(body) });
      setToast(kind === "draft" ? "Draft saved" : extra.status === "live" ? "Flash drop is live" : "Flash drop scheduled");
      navigate("/flash-drops");
    } catch (err) {
      setError(err.message || "Could not save flash drop.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = catalog.filter((p) => {
    const q = pq.trim().toLowerCase();
    if (!q) return true;
    return `${p.name} ${p.sku}`.toLowerCase().includes(q);
  });

  const typeLabel = TYPES.find((t) => t.id === form.type)?.label || "Percentage Discount";
  const scheduled = form.status !== "live";

  return (
    <div className="fdf-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/flash-drops">Flash Drops</Link>
        <span>›</span>
        <strong>Create / Schedule Flash Drop</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            Create / Schedule Flash Drop
            <span className="prod-title-icon"><Icon name="bolt" size={16} /></span>
          </h1>
          <p>Set product, price, stock and schedule for a limited-time flash drop sale.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={() => submit("draft")}>
            Save as Draft
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setForm(emptyForm())}>
            Reset
          </button>
          <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={() => submit("save")}>
            {scheduled ? "Save & Schedule Drop" : "Save & Go Live"}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <div className="pts-layout has-side comp-layout fdf-layout">
        <div className="fdf-main">
          <Section n="1" title="Basic Information">
            <label>Drop Name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} />

            <div className="pf-2">
              <div>
                <label>Drop Category</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label>Drop Type</label>
                <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <label>Drop Description</label>
            <textarea
              rows={3}
              maxLength={255}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            <div className="pf-count">{form.description.length} / 255</div>

            <label>Status</label>
            <div className="fdf-seg">
              <button type="button" className={form.status === "live" ? "on" : ""} onClick={() => set("status", "live")}>
                Live Now
              </button>
              <button type="button" className={scheduled ? "on" : ""} onClick={() => set("status", "upcoming")}>
                Scheduled
              </button>
            </div>
          </Section>

          <Section n="2" title="Product & Pricing">
            <label>Select Product</label>
            {form.product ? (
              <div className="fdf-prod">
                <img src={form.product.image} alt="" />
                <div>
                  <strong>{form.product.name}</strong>
                  <div className="muted">{form.product.sku}</div>
                </div>
                <button className="icon-btn" type="button" aria-label="Remove product" onClick={() => set("product", null)}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : (
              <p className="muted">No product selected.</p>
            )}
            <button className="link-reset fdf-choose" type="button" onClick={() => setPicker((v) => !v)}>
              + Choose Another Product
            </button>
            {picker && (
              <div className="fdf-picker">
                <input
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  placeholder="Search products..."
                />
                <ul>
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => pickProduct(p)}>
                        <img src={p.image} alt="" />
                        <span>
                          <strong>{p.name}</strong>
                          <em>{p.sku} · {kes(p.priceKes)}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li className="muted">No products match.</li>}
                </ul>
              </div>
            )}

            <div className="fdf-3">
              <div>
                <label>Original Price (KSh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.originalKes}
                  onChange={(e) => set("originalKes", e.target.value)}
                />
              </div>
              <div>
                <label>Discount</label>
                <div className="pts-prefix">
                  <input type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
                  <em>{form.type === "fixed" ? "KSh" : "%"}</em>
                </div>
              </div>
              <div>
                <label>Discounted Price (KSh)</label>
                <input className="fdf-flash" readOnly value={flashKes.toFixed(2)} />
              </div>
            </div>
            <p className="fdf-save">You Save: {kes2(saveAmt)} ({savePct}%)</p>
          </Section>

          <Section n="3" title="Stock & Quantity">
            <div className="fdf-3">
              <div>
                <label>Total Stock for Drop</label>
                <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
              </div>
              <div>
                <label>Max Quantity per Customer</label>
                <input type="number" value={form.maxQty} onChange={(e) => set("maxQty", e.target.value)} />
              </div>
              <div>
                <label>Reserved Stock (Optional)</label>
                <input type="number" value={form.reserved} onChange={(e) => set("reserved", e.target.value)} />
              </div>
            </div>
            <label>Start Stock</label>
            <input className="fdf-start-stock" readOnly value={form.stock} />
          </Section>

          <Section n="4" title="Schedule">
            <div className="fdf-sched">
              <div>
                <label>Start Date & Time</label>
                <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div>
                <label>End Date & Time</label>
                <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
              <div className="fdf-dur">
                <span className="muted">Duration</span>
                <strong>{dur.hours} hours {dur.mins} minutes</strong>
              </div>
            </div>
          </Section>

          <Section n="5" title="Additional Settings">
            <div className="fdf-toggles">
              <label className="ce-set-row">
                <span>Show countdown timer</span>
                <Switch on={form.showCountdown} onClick={() => set("showCountdown", !form.showCountdown)} />
              </label>
              <label className="ce-set-row">
                <span>Allow backorders</span>
                <Switch on={form.allowBackorders} onClick={() => set("allowBackorders", !form.allowBackorders)} />
              </label>
              <label className="ce-set-row">
                <span>Require points to participate</span>
                <Switch on={form.requirePoints} onClick={() => set("requirePoints", !form.requirePoints)} />
              </label>
              <label className="ce-set-row">
                <span>Notify customers</span>
                <Switch on={form.notify} onClick={() => set("notify", !form.notify)} />
              </label>
            </div>
            <label>Bonus Points (Optional)</label>
            <input type="number" value={form.bonusPoints} onChange={(e) => set("bonusPoints", e.target.value)} />
            <label>Tags / Labels (Optional)</label>
            <div className="pf-tags">
              {form.tags.map((t) => (
                <button type="button" key={t} className="pf-chip" onClick={() => set("tags", form.tags.filter((x) => x !== t))}>
                  {t} ×
                </button>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagDraft.replace(",", ""));
                  }
                }}
                placeholder="Type a tag and press Enter"
              />
            </div>
          </Section>
        </div>

        <aside className="pts-side fdf-side">
          <section className="card fdf-preview">
            <div className="fdf-preview-head">
              <span className="fdf-badge">FLASH DROP</span>
              {form.showCountdown && (
                <div className="fdf-cd">
                  <span className="muted">{scheduled ? "Starts in" : "Ends in"}</span>
                  <div className="fdf-cd-cells">
                    <b>{pad(countdown.days)}</b><i>:</i>
                    <b>{pad(countdown.hours)}</b><i>:</i>
                    <b>{pad(countdown.mins)}</b><i>:</i>
                    <b>{pad(countdown.secs)}</b>
                  </div>
                </div>
              )}
            </div>
            {form.product?.image && <img src={form.product.image} alt="" />}
            <h3>{form.product?.name || form.name}</h3>
            <div className="fdf-stars" aria-label="4.8 stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name="star" size={14} />
              ))}
              <span>4.8</span>
            </div>
            <div className="fdf-price">
              <strong>{kes2(flashKes)}</strong>
              <em>{form.type === "percentage" ? `${form.discount}% OFF` : typeLabel}</em>
            </div>
            <s className="muted">{kes2(form.originalKes)}</s>
            <div className="fdf-preview-stats">
              <span><Icon name="bag" size={14} /> {form.stock}</span>
              <span><Icon name="users" size={14} /> {form.maxQty}</span>
              <span><Icon name="clock" size={14} /> {dur.hours}h {dur.mins}m</span>
            </div>
          </section>

          <section className="card pts-widget">
            <h3>Flash Drop Summary</h3>
            <ul className="pts-sum">
              <li><span>Name</span><b>{form.name || "—"}</b></li>
              <li><span>Category</span><b>{form.category}</b></li>
              <li><span>Type</span><b>{typeLabel}</b></li>
              <li><span>Original</span><b>{kes2(form.originalKes)}</b></li>
              <li><span>Flash price</span><b>{kes2(flashKes)}</b></li>
              <li><span>Stock</span><b>{form.stock}</b></li>
              <li><span>Max / customer</span><b>{form.maxQty}</b></li>
              <li><span>Start</span><b>{fmtLabel(form.startsAt)}</b></li>
              <li><span>End</span><b>{fmtLabel(form.endsAt)}</b></li>
              <li>
                <span>Status</span>
                <b><span className={`st-pill ${scheduled ? "comp-type-quiz" : "st-pub"}`}>{scheduled ? "Scheduled" : "Live"}</span></b>
              </li>
            </ul>
          </section>

          <section className="cd-note">
            <Icon name="help" size={16} />
            <p>Once the flash drop starts, price will automatically change and customers will be able to purchase until time ends or stock is depleted.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
