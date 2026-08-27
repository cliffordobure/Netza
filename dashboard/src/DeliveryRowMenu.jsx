import { Icon } from "./icons";

/** Shared ⋮ menu used by Delivery tables. */
export function DeliveryRowMenu({ id, menu, setMenu, up, children }) {
  return (
    <span className="ord-menu-wrap">
      <button
        type="button"
        title="More"
        onClick={(e) => {
          e.stopPropagation();
          setMenu(menu === id ? null : id);
        }}
      >
        <Icon name="more" size={14} />
      </button>
      {menu === id && (
        <div
          className={`ord-menu ${up ? "dlv-menu-up" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export function DeliveryDetailModal({ title, subtitle, statusNode, onClose, children, actions }) {
  return (
    <div className="prod-modal" onClick={onClose}>
      <div className="card prod-modal-card dlv-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ord-drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        {statusNode ? <div className="dlv-detail-status">{statusNode}</div> : null}
        {children}
        <div className="prod-actions rule-drawer-acts dlv-detail-acts">
          {actions}
          <button className="btn btn-ghost btn-small" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function DetailMeta({ rows }) {
  return (
    <dl className="dlv-detail-meta">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
