import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, uploadImage } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DeliveryRowMenu, DetailMeta } from "../DeliveryRowMenu";

function fmtNum(n, digits = 0) {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n || 0);
}

function statusCls(status) {
  if (status === "active") return "mktov-st-active";
  if (status === "scheduled") return "mktov-st-sched";
  if (status === "paused") return "mktov-st-draft";
  if (status === "expired") return "mktov-st-done";
  return "mktov-st-draft";
}

const emptyForm = {
  name: "",
  placement: "Home Hero",
  link: "/catalog",
  subtitle: "",
  ctaLabel: "Shop now",
  startsAt: "",
  endsAt: "",
  isActive: true,
  file: null,
  preview: "",
};

export default function MarketingBanners() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("");
  const [placementF, setPlacementF] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function qs(next = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: next.q ?? q,
      status: next.status ?? statusF,
      placement: next.placement ?? placementF,
      page: next.page ?? page,
      limit: next.limit ?? limit,
    };
    if (vals.q) p.set("q", vals.q);
    if (vals.status) p.set("status", vals.status);
    if (vals.placement) p.set("placement", vals.placement);
    p.set("page", String(vals.page));
    p.set("limit", String(vals.limit));
    return p.toString();
  }

  function load(overrides = {}) {
    api(`/banners/admin/all?${qs(overrides)}`)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message || "Could not load banners."));
  }

  useEffect(() => {
    load();
    /* eslint-disable-next-line */
  }, [page, limit, statusF, placementF]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  function open(r, e) {
    e?.stopPropagation?.();
    setMenu(null);
    setViewing(r);
  }

  function onFile(e) {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setForm((f) => ({ ...f, file: null, preview: "" }));
      return;
    }
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, file, preview }));
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.name.trim()) return setToast("Banner name is required");
    if (!form.file && !form.preview) return setToast("Please choose a banner image");
    setSaving(true);
    try {
      let imageUrl = form.preview.startsWith("http") ? form.preview : "";
      if (form.file) {
        const up = await uploadImage(form.file, "misc");
        imageUrl = up.url;
      }
      if (!imageUrl) throw new Error("Image upload failed");
      await api("/banners", {
        method: "POST",
        body: JSON.stringify({
          title: form.name.trim(),
          name: form.name.trim(),
          subtitle: form.subtitle.trim(),
          ctaLabel: form.ctaLabel.trim() || "Shop now",
          link: form.link.trim() || "/catalog",
          imageUrl,
          placement: form.placement,
          isActive: form.isActive,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        }),
      });
      setFormOpen(false);
      setForm(emptyForm);
      setToast(`Banner “${form.name}” saved`);
      load({ page: 1 });
      setPage(1);
      if (searchParams.get("new") === "1") navigate("/marketing?tab=banners", { replace: true });
    } catch (err) {
      setToast(err.message || "Could not save banner");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r) {
    try {
      await api(`/banners/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: r.status === "active" ? false : true }),
      });
      setToast(r.status === "active" ? `Paused “${r.name}”` : `Activated “${r.name}”`);
      setViewing(null);
      load();
    } catch (err) {
      setToast(err.message || "Update failed");
    }
  }

  async function removeBanner(r) {
    if (!window.confirm(`Delete banner “${r.name}”?`)) return;
    try {
      await api(`/banners/${r.id}`, { method: "DELETE" });
      setToast(`Deleted “${r.name}”`);
      setViewing(null);
      load();
    } catch (err) {
      setToast(err.message || "Delete failed");
    }
  }

  if (!data) {
    return (
      <div className="mktpg-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/marketing">Marketing</Link>
          <span>›</span>
          <strong>Banners</strong>
        </nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading banners…</p>}
      </div>
    );
  }

  const stats = data.stats || {};
  const rows = data.banners || [];
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);

  return (
    <div className="mktpg-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/marketing">Marketing</Link>
        <span>›</span>
        <strong>Banners</strong>
      </nav>
      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon solid">
              <Icon name="layers" size={16} />
            </span>{" "}
            Banners
          </h1>
          <p>Manage homepage, app and category promotional banners. Home Hero banners show in the mobile app.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/marketing")}>
            Back to Overview
          </button>
          <button
            className="btn btn-purple btn-small"
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            <Icon name="upload" size={14} /> Upload Banner
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats five mktpg-kpis">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Active Banners</div>
            <div className="prod-stat-n purple">{fmtNum(stats.active)}</div>
          </div>
          <div className="prod-stat-icon purple">
            <Icon name="layers" size={16} />
          </div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Impressions</div>
            <div className="prod-stat-n green">{fmtNum(stats.impressions)}</div>
          </div>
          <div className="prod-stat-icon green">
            <Icon name="eye" size={16} />
          </div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Clicks</div>
            <div className="prod-stat-n blue">{fmtNum(stats.clicks)}</div>
          </div>
          <div className="prod-stat-icon blue">
            <Icon name="trend" size={16} />
          </div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Avg. CTR</div>
            <div className="prod-stat-n orange">{fmtNum(stats.avgCtr, 1)}%</div>
          </div>
          <div className="prod-stat-icon orange">
            <Icon name="chart" size={16} />
          </div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Scheduled</div>
            <div className="prod-stat-n indigo">{fmtNum(stats.scheduled)}</div>
          </div>
          <div className="prod-stat-icon indigo">
            <Icon name="calendar" size={16} />
          </div>
        </article>
      </section>

      <section className="card prod-filters">
        <form
          className="prod-filter-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load({ q, page: 1 });
          }}
        >
          <div className="prod-search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search banners..." />
          </div>
          <select
            value={placementF}
            onChange={(e) => {
              setPlacementF(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Placements</option>
            {(data.filters?.placements || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={statusF}
            onChange={(e) => {
              setStatusF(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            {(data.filters?.statuses || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost btn-small" type="submit">
            <Icon name="filter" size={14} /> Filter
          </button>
        </form>
      </section>

      <section className="card prod-table-wrap mktpg-table-card">
        <table className="table prod-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Banner</th>
              <th>Placement</th>
              <th>Status</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Validity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td>
                  <button className="link-reset mktov-camp-btn" type="button" onClick={(e) => open(r, e)}>
                    <div className="prod-cell mktpg-banner">
                      {r.image ? (
                        <img src={r.image} alt="" />
                      ) : (
                        <span className="mktpg-banner-fallback">BN</span>
                      )}
                      <strong>{r.name}</strong>
                    </div>
                  </button>
                </td>
                <td>{r.placement}</td>
                <td>
                  <span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span>
                </td>
                <td>{fmtNum(r.impressions)}</td>
                <td>{fmtNum(r.clicks)}</td>
                <td>{r.ctr ? `${fmtNum(r.ctr, 1)}%` : "—"}</td>
                <td className="mktpg-sub">
                  {r.starts} → {r.ends}
                </td>
                <td>
                  <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                    <button type="button" title="View" onClick={(e) => open(r, e)}>
                      <Icon name="eye" size={14} />
                    </button>
                    <DeliveryRowMenu id={r.id} menu={menu} setMenu={setMenu} up={r.n >= rows.length - 1}>
                      <button type="button" onClick={(e) => open(r, e)}>
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu(null);
                          toggleActive(r);
                        }}
                      >
                        {r.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu(null);
                          removeBanner(r);
                        }}
                      >
                        Delete
                      </button>
                    </DeliveryRowMenu>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="9" className="muted">
                  No banners yet. Upload one to show it in the app.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <footer className="prod-pager">
          <span>
            Showing {fromN} to {toN} of {fmtNum(total)} banners
          </span>
          <div className="pager-btns">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <Icon name="chevronLeft" size={14} />
            </button>
            <button type="button" className="on">
              {page}
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </footer>
      </section>

      {formOpen && (
        <div className="prod-modal bnr-modal-overlay" onClick={() => !saving && setFormOpen(false)}>
          <form className="card bnr-upload-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <header className="bnr-upload-head">
              <div>
                <h2>Upload Banner</h2>
                <p>Home Hero banners appear in the mobile app carousel.</p>
              </div>
              <button className="bnr-upload-close" type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close">
                <Icon name="x" size={16} />
              </button>
            </header>

            <div className="bnr-upload-body">
              <label className={`bnr-drop ${form.preview ? "has-preview" : ""}`}>
                {form.preview ? (
                  <img src={form.preview} alt="Banner preview" />
                ) : (
                  <div className="bnr-drop-empty">
                    <Icon name="upload" size={22} />
                    <strong>Choose banner image</strong>
                    <span>PNG or JPG · recommended 1200×600</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={onFile} required={!form.preview} />
              </label>
              {form.preview && (
                <button
                  className="btn btn-ghost btn-small bnr-change-img"
                  type="button"
                  onClick={() => document.getElementById("bnr-file-input")?.click()}
                >
                  Change image
                </button>
              )}
              <input id="bnr-file-input" type="file" accept="image/*" hidden onChange={onFile} />

              <div className="bnr-form-grid">
                <label>
                  Name
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Flash Drop Hero" required />
                </label>
                <label>
                  Placement
                  <select value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}>
                    {(data.filters?.placements || ["Home Hero"]).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Subtitle
                  <input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="Short line under the title" />
                </label>
                <label>
                  Button label
                  <input value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} />
                </label>
                <label>
                  Link
                  <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="/catalog" />
                </label>
                <label>
                  Starts
                  <input type="date" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                </label>
                <label>
                  Ends
                  <input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                </label>
                <label className="bnr-active full">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span>
                    <strong>Active</strong>
                    <em>Show when within the start/end dates</em>
                  </span>
                </label>
              </div>
            </div>

            <footer className="bnr-upload-foot">
              <button className="btn btn-ghost" type="button" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-purple" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save banner"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {viewing && (
        <DeliveryDetailModal
          title={viewing.name}
          subtitle={viewing.placement}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={
            <>
              <button className="btn btn-purple btn-small" type="button" onClick={() => toggleActive(viewing)}>
                {viewing.status === "active" ? "Pause" : "Activate"}
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => removeBanner(viewing)}>
                Delete
              </button>
            </>
          }
        >
          <div className="mktpg-banner-preview">
            {viewing.image ? <img src={viewing.image} alt="" /> : <p className="muted">No image</p>}
          </div>
          <DetailMeta
            rows={[
              { label: "Link", value: viewing.link || "—" },
              { label: "Starts", value: viewing.starts },
              { label: "Ends", value: viewing.ends },
            ]}
          />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
