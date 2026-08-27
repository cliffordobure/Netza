import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import { DeliveryDetailModal, DetailMeta } from "../DeliveryRowMenu";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function statusCls(status) {
  if (status === "completed") return "sup-st-resolved";
  if (status === "processing") return "sup-st-pending";
  return "sup-st-open";
}

export default function ProductImport() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [viewing, setViewing] = useState(null);
  const [type, setType] = useState("products");
  const [fileName, setFileName] = useState("");

  function load() {
    api("/admin/product-import")
      .then((d) => { setData(d); setError(""); })
      .catch((e) => setError(e.message || "Could not load import history."));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function startImport(e) {
    e.preventDefault();
    if (!fileName) return setToast("Choose a CSV or Excel file first");
    setToast(`Import started for ${fileName}`);
    setFileName("");
  }

  if (!data) {
    return (
      <div className="imp-page">
        <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/products">Products</Link><span>›</span><strong>Bulk Import</strong></nav>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading import tools…</p>}
      </div>
    );
  }

  const stats = data.stats || {};

  return (
    <div className="imp-page">
      <nav className="crumbs"><Link to="/">Dashboard</Link><span>›</span><Link to="/products">Products</Link><span>›</span><strong>Bulk Import</strong></nav>
      <div className="prod-head">
        <div>
          <h1><span className="prod-title-icon solid"><Icon name="upload" size={16} /></span> Bulk Import</h1>
          <p>Upload CSV or Excel files to create or update catalog data in bulk.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/products")}>Back to Products</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className="pts-stats four units-kpis">
        <article className="prod-stat cat-stat"><div><div className="muted">Imports</div><div className="prod-stat-n purple">{fmtNum(stats.imports)}</div></div><div className="prod-stat-icon purple"><Icon name="upload" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Successful Rows</div><div className="prod-stat-n green">{fmtNum(stats.successRows)}</div></div><div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Failed Rows</div><div className="prod-stat-n red">{fmtNum(stats.failedRows)}</div></div><div className="prod-stat-icon red"><Icon name="xCircle" size={16} /></div></article>
        <article className="prod-stat cat-stat"><div><div className="muted">Processing</div><div className="prod-stat-n orange">{fmtNum(stats.processing)}</div></div><div className="prod-stat-icon orange"><Icon name="clock" size={16} /></div></article>
      </section>

      <div className="imp-layout">
        <section className="card pf-card">
          <h2><Icon name="upload" size={14} /> Upload file</h2>
          <form className="form-grid" onSubmit={startImport}>
            <label>
              Import type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {(data.templates || []).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="full">
              File
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              />
              {fileName ? <small className="muted">Selected: {fileName}</small> : <small className="muted">CSV or Excel up to 5MB</small>}
            </label>
            <div className="prod-actions full">
              <button className="btn btn-purple btn-small" type="submit"><Icon name="upload" size={14} /> Start import</button>
              <button
                className="btn btn-ghost btn-small"
                type="button"
                onClick={() => {
                  const tpl = (data.templates || []).find((t) => t.key === type);
                  setToast(`Template columns: ${tpl?.columns || "—"}`);
                }}
              >
                <Icon name="download" size={14} /> Download template
              </button>
            </div>
          </form>
        </section>

        <section className="card pf-card">
          <h2><Icon name="layers" size={14} /> Templates</h2>
          <ul className="imp-templates">
            {(data.templates || []).map((t) => (
              <li key={t.key}>
                <strong>{t.label}</strong>
                <span className="muted">{t.columns}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card prod-table-wrap units-table-card">
        <div className="sup-table-head"><h2>Import history</h2></div>
        <table className="table prod-table">
          <thead>
            <tr><th>#</th><th>File</th><th>Type</th><th>Rows</th><th>Success</th><th>Failed</th><th>Status</th><th>Date</th><th>By</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(data.history || []).map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.n}</td>
                <td><strong>{r.file}</strong></td>
                <td>{r.type}</td>
                <td>{fmtNum(r.rows)}</td>
                <td className="green">{fmtNum(r.success)}</td>
                <td className={r.failed ? "red" : ""}>{fmtNum(r.failed)}</td>
                <td><span className={`st-pill ${statusCls(r.status)}`}>{r.statusLabel}</span></td>
                <td>{r.date}</td>
                <td>{r.by}</td>
                <td>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setViewing(r)}>
                    <Icon name="eye" size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {viewing && (
        <DeliveryDetailModal
          title={viewing.file}
          subtitle={viewing.type}
          statusNode={<span className={`st-pill ${statusCls(viewing.status)}`}>{viewing.statusLabel}</span>}
          onClose={() => setViewing(null)}
          actions={<button className="btn btn-purple btn-small" type="button" onClick={() => { setToast(`Re-queued ${viewing.file}`); setViewing(null); }}>Re-run</button>}
        >
          <DetailMeta rows={[
            { label: "Rows", value: fmtNum(viewing.rows) },
            { label: "Success", value: fmtNum(viewing.success) },
            { label: "Failed", value: fmtNum(viewing.failed) },
            { label: "Date", value: viewing.date },
            { label: "Uploaded by", value: viewing.by },
          ]} />
        </DeliveryDetailModal>
      )}
    </div>
  );
}
