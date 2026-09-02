import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";

const TABS = [
  { id: "info", label: "Order Information" },
  { id: "items", label: "Order Items" },
  { id: "payments", label: "Payments" },
  { id: "shipping", label: "Shipping" },
  { id: "returns", label: "Returns & Refunds" },
  { id: "activity", label: "Activity Log" },
  { id: "notes", label: "Notes" },
];

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function statusCls(status) {
  if (status === "delivered") return "ord-st-delivered";
  if (status === "shipped") return "ord-st-shipped";
  if (status === "processing") return "ord-st-processing";
  if (status === "pending") return "ord-st-pending";
  if (status === "cancelled") return "ord-st-cancelled";
  return "ord-st-processing";
}

function copyText(text, setToast) {
  navigator.clipboard?.writeText(text).then(() => setToast("Address copied"));
}

function printInvoice(order) {
  const w = window.open("", "_blank", "width=760,height=900");
  if (!w) return;
  const rows = (order.items || [])
    .map(
      (i) =>
        `<tr><td>${i.name}<br><small>${i.sku}</small></td><td>${kes(i.priceKes)}</td><td>${i.quantity}</td><td>${kes(i.discountKes || 0)}</td><td>${kes(i.totalKes)}</td></tr>`
    )
    .join("");
  w.document.write(`<!doctype html><html><head><title>${order.orderNumber}</title>
    <style>body{font-family:Inter,Arial,sans-serif;padding:28px;color:#0B1F3A}h1{font-size:20px;margin:0}
    table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px}
    .muted{color:#64748b}.total{text-align:right;font-weight:800;margin-top:12px}</style></head><body>
    <h1>Tajira Kenya — Invoice</h1>
    <p class="muted">${order.orderNumber} · ${order.placedAt || ""}</p>
    <p><strong>${order.customer?.name || ""}</strong><br>${order.customer?.email || ""}<br>${order.customer?.phone || ""}</p>
    <table><thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Discount</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="total">Total ${kes(order.summary?.totalKes || 0)}</p></body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState("info");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    api(`/admin/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        setError("");
      })
      .catch((e) => setError(e.message || "Order not found"));
  }, [id]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function close() {
      setActionsOpen(false);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  if (!order && !error) {
    return (
      <div className="ordd-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/orders">Orders</Link>
          <span>›</span>
          <Link to="/orders">All Orders</Link>
          <span>›</span>
          <strong>…</strong>
        </nav>
        <p className="muted">Loading order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="ordd-page">
        <nav className="crumbs">
          <Link to="/">Dashboard</Link>
          <span>›</span>
          <Link to="/orders">Orders</Link>
        </nav>
        <p className="error">{error || "Order not found"}</p>
        <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/orders")}>
          Back to Orders
        </button>
      </div>
    );
  }

  const s = order.summary || {};
  const customer = order.customer || {};
  const ship = order.shippingAddress || {};
  const bill = order.billingAddress || {};
  const pay = order.payment || {};
  const items = order.items || [];

  return (
    <div className="ordd-page ord">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/orders">Orders</Link>
        <span>›</span>
        <Link to="/orders">All Orders</Link>
        <span>›</span>
        <strong>{order.orderNumber}</strong>
      </nav>

      <div className="ordd-head">
        <div>
          <h1>
            Order Details
            <span className={`st-pill ${statusCls(order.status)}`}>{order.statusLabel}</span>
          </h1>
          <p>
            Order ID: <strong>{order.orderNumber}</strong>
            <span className="ordd-dot-sep">•</span>
            Placed on {order.placedAt || `${order.orderDate}, ${order.orderTime}`}
          </p>
        </div>
        <div className="prod-actions ordd-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/orders")}>
            <Icon name="chevronLeft" size={14} /> Back to Orders
          </button>
          <button className="btn btn-ghost btn-small" type="button" onClick={() => printInvoice(order)}>
            <Icon name="print" size={14} /> Print Invoice
          </button>
          <div className="ordd-dd-wrap">
            <button
              className="btn btn-purple btn-small ordd-actions-dd"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActionsOpen((v) => !v);
              }}
            >
              Actions
              <Icon name="chevron" size={14} />
            </button>
            {actionsOpen && (
              <div className="ordd-dd" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setToast("Order duplicated")}>Duplicate order</button>
                <button type="button" onClick={() => setToast("Refund initiated")}>Issue refund</button>
                <button type="button" onClick={() => setToast("Customer notified")}>Notify customer</button>
                <button type="button" className="danger" onClick={() => setToast("Cancel request sent")}>Cancel order</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <p className="cust-toast">{toast}</p>}

      <section className="card ordd-timeline">
        <div className="ordd-steps">
          {(order.timeline || []).map((step, i, arr) => (
            <div key={step.key} className={`ordd-step ${step.done ? "done" : ""} ${step.current ? "current" : ""}`}>
              <div className="ordd-step-track">
                <span className="ordd-step-icon">
                  {step.done || step.current ? <Icon name="check" size={16} /> : <Icon name="clock" size={16} />}
                </span>
                {i < arr.length - 1 && <i className="ordd-step-line" />}
              </div>
              <div className="ordd-step-body">
                <strong>{step.label}</strong>
                <span className="muted">{step.at}</span>
                {step.current && order.statusLabel && (
                  <span className={`st-pill ${statusCls(order.status)} ordd-step-badge`}>{order.statusLabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ordd-layout">
        <div className="ordd-main">
          <div className="ordd-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "on" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <>
              <section className="card pf-card ordd-info-card">
                <h2>Order Information</h2>
                <dl className="ordd-kv">
                  <div><dt>Order ID</dt><dd>{order.orderNumber}</dd></div>
                  <div><dt>Order Date</dt><dd>{order.placedAt || `${order.orderDate}, ${order.orderTime}`}</dd></div>
                  <div><dt>Order Status</dt><dd><span className={`st-pill ${statusCls(order.status)}`}>{order.statusLabel}</span></dd></div>
                  <div><dt>Payment Status</dt><dd><span className="st-pill pay-paid">{order.paymentLabel || pay.statusLabel}</span></dd></div>
                  <div><dt>Order Type</dt><dd>{order.orderType || "Online Order"}</dd></div>
                  <div><dt>Sales Channel</dt><dd>{order.salesChannel || "Website"}</dd></div>
                  <div><dt>Placed By</dt><dd>{order.placedBy || customer.name}</dd></div>
                  <div><dt>IP Address</dt><dd>{order.ipAddress || "—"}</dd></div>
                  <div><dt>Device</dt><dd>{order.device || "—"}</dd></div>
                  <div><dt>Coupon Used</dt><dd>{order.coupon || "—"}</dd></div>
                  <div className="wide"><dt>Customer Note</dt><dd>{order.customerNote || "—"}</dd></div>
                </dl>
              </section>

              <div className="ordd-addr-grid">
                <section className="card pf-card ordd-addr">
                  <div className="ordd-addr-head">
                    <h2><Icon name="truck" size={14} /> Shipping Address</h2>
                    <button
                      type="button"
                      className="ordd-copy"
                      onClick={() => copyText([ship.name, ...ship.lines].join("\n"), setToast)}
                    >
                      Copy Address
                    </button>
                  </div>
                  <p><strong>{ship.name}</strong></p>
                  <p className="muted">{ship.phone}</p>
                  {(ship.lines || []).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {ship.postalCode && <p className="muted">Postal: {ship.postalCode}</p>}
                </section>
                <section className="card pf-card ordd-addr">
                  <div className="ordd-addr-head">
                    <h2><Icon name="receipt" size={14} /> Billing Address</h2>
                    <button
                      type="button"
                      className="ordd-copy"
                      onClick={() => copyText([bill.name, ...bill.lines].join("\n"), setToast)}
                    >
                      Copy Address
                    </button>
                  </div>
                  <p><strong>{bill.name}</strong></p>
                  <p className="muted">{bill.phone}</p>
                  {(bill.lines || []).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {bill.postalCode && <p className="muted">Postal: {bill.postalCode}</p>}
                </section>
              </div>

              {order.deliveryInstructions && (
                <section className="card ordd-instructions">
                  <h2><Icon name="info" size={14} /> Delivery Instructions</h2>
                  <p>{order.deliveryInstructions}</p>
                </section>
              )}
            </>
          )}

          {(tab === "info" || tab === "items") && (
            <section className="card prod-table-wrap ordd-items-card">
                <div className="ordd-items-head">
                  <h2>Order Items ({s.itemCount || items.length})</h2>
                </div>
                <table className="table prod-table ordd-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price (KES)</th>
                      <th>Qty</th>
                      <th>Discount</th>
                      <th>Total (KES)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id || item.sku}>
                        <td>
                          <div className="ordd-product">
                            {item.image ? <img src={item.image} alt="" /> : <div className="prod-ph" />}
                            <div>
                              <strong>{item.name}</strong>
                              <span className="muted">{item.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td>{kes(item.priceKes)}</td>
                        <td>{item.quantity}</td>
                        <td>{item.discountKes ? kes(item.discountKes) : "—"}</td>
                        <td><strong>{kes(item.totalKes)}</strong></td>
                        <td><span className={`st-pill ${statusCls(item.status || order.status)}`}>{item.statusLabel || order.statusLabel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <footer className="ordd-items-foot">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => printInvoice(order)}>
                    <Icon name="download" size={14} /> Download Invoice
                  </button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Returns module coming soon")}>
                    View Return / Refund
                  </button>
                </footer>
              </section>
          )}

          {tab === "payments" && (
            <section className="card pf-card">
              <h2>Payment Details</h2>
              <dl className="ordd-kv">
                <div><dt>Method</dt><dd>{pay.methodLabel || pay.method}</dd></div>
                <div><dt>Status</dt><dd><span className="st-pill pay-paid">{pay.statusLabel}</span></dd></div>
                <div><dt>Transaction ID</dt><dd>{pay.transactionId}</dd></div>
                <div><dt>Paid At</dt><dd>{pay.paidAt}</dd></div>
                <div><dt>Amount</dt><dd><strong>{kes(s.paidKes || s.totalKes)}</strong></dd></div>
              </dl>
            </section>
          )}

          {tab === "shipping" && (
            <section className="card pf-card">
              <h2>Shipping Details</h2>
              <dl className="ordd-kv">
                <div><dt>Delivery Method</dt><dd>{order.deliveryMethod}</dd></div>
                <div><dt>City</dt><dd>{order.deliveryCity}</dd></div>
                <div><dt>Status</dt><dd><span className={`st-pill ${statusCls(order.status)}`}>{order.statusLabel}</span></dd></div>
                <div className="wide"><dt>Instructions</dt><dd>{order.deliveryInstructions || "—"}</dd></div>
              </dl>
            </section>
          )}

          {tab === "returns" && (
            <section className="card pf-card">
              <h2>Returns & Refunds</h2>
              <p className="muted">No return or refund requests for this order.</p>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setToast("Return request form coming soon")}>
                Start Return Request
              </button>
            </section>
          )}

          {tab === "activity" && (
            <section className="card pf-card">
              <h2>Activity Log</h2>
              <ul className="ordd-activity">
                {(order.activity || []).map((a) => (
                  <li key={a.id}>
                    <i className={`ordc-dot ${a.tone}`} />
                    <div>
                      <strong>{a.text}</strong>
                      <span className="muted">{a.user} · {a.at}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab === "notes" && (
            <section className="card pf-card">
              <h2>Notes</h2>
              <ul className="ordd-notes">
                {(order.notes || []).map((n) => (
                  <li key={n.id}>
                    <strong>{n.author}</strong>
                    <span className="muted">{n.role} · {n.at}</span>
                    <p>{n.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="ordd-side">
          <section className="card pf-card ordd-customer">
            <div className="ordd-addr-head">
              <h2><Icon name="users" size={14} /> Customer Information</h2>
              <Link to={`/customers/${customer.id || ""}`} className="ordd-copy" onClick={(e) => !customer.id && e.preventDefault()}>
                View Profile
              </Link>
            </div>
            <div className="ordd-customer-hero">
              <img src={customer.avatar} alt="" />
              <div>
                <strong>{customer.name}</strong>
                {customer.badge && <span className="ordd-vip">{customer.badge}</span>}
                <div className="muted">{customer.phone}</div>
                <div className="muted">{customer.email}</div>
                {customer.memberSince && <div className="ordd-member">Member since {customer.memberSince}</div>}
              </div>
            </div>
            <div className="ordd-customer-stats">
              <div><span>Total Orders</span><strong>{fmtNum(customer.totalOrders)}</strong></div>
              <div><span>Total Spent</span><strong>{kes(customer.totalSpentKes)}</strong></div>
              <div><span>Loyalty Points</span><strong className="purple">{fmtNum(customer.loyaltyPoints)}</strong></div>
            </div>
            <button className="ordd-customer-link" type="button" onClick={() => setToast("Opening customer profile")}>
              <Icon name="users" size={14} /> View Customer Details
            </button>
          </section>

          <section className="card pf-card ordd-summary">
            <h2><Icon name="receipt" size={14} /> Order Summary</h2>
            <dl className="ordd-sum">
              <div><dt>Subtotal ({s.itemCount || items.length} items)</dt><dd>{kes(s.subtotalKes)}</dd></div>
              {s.discountKes ? (
                <div className="discount"><dt>Discount ({s.discountLabel})</dt><dd>- {kes(s.discountKes)}</dd></div>
              ) : null}
              <div><dt>Delivery Fee</dt><dd>{kes(s.deliveryKes)}</dd></div>
              <div><dt>Packaging Fee</dt><dd>{kes(s.packagingKes)}</dd></div>
              <div><dt>{s.taxLabel || "Tax (16% VAT)"}</dt><dd>{kes(s.taxKes)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{kes(s.totalKes)}</dd></div>
              <div className="paid"><dt>Paid Amount</dt><dd>{kes(s.paidKes)}</dd></div>
              <div className="due"><dt>Amount Due</dt><dd>{kes(s.dueKes)}</dd></div>
            </dl>
          </section>

          <section className="card pf-card ordd-pay-card">
            <h2><Icon name="card" size={14} /> Payment Method</h2>
            <div className="ordd-mpesa">
              <span className="ordd-mpesa-logo">M-PESA</span>
            </div>
            <dl className="ordd-pay-meta">
              <div><dt>Transaction ID</dt><dd>{pay.transactionId}</dd></div>
              <div><dt>Paid on</dt><dd>{pay.paidAt}</dd></div>
            </dl>
            <button className="ordd-customer-link" type="button" onClick={() => setTab("payments")}>
              View Payment Details
            </button>
          </section>
        </aside>
      </div>

      {order.footerMessage && (
        <footer className="card pf-card ordd-foot">
          <p>
            <Icon name="info" size={14} />
            {order.footerMessage}
          </p>
        </footer>
      )}
    </div>
  );
}
