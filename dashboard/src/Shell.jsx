import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { api, kes, mediaUrl } from "./api";
import { useAuth } from "./auth";
import { Icon } from "./icons";

const NAV = [
  { to: "/", label: "Dashboard", icon: "home", end: true },
  {
    to: "/products",
    label: "Products",
    icon: "box",
    children: [
      { to: "/products", label: "All Products", end: true },
      { to: "/products/categories", label: "Categories" },
      { to: "/products/brands", label: "Brands" },
      { to: "/products/attributes", label: "Attributes" },
      { to: "/products/units", label: "Units" },
      { to: "/products/import", label: "Bulk Import" },
      { to: "/products/adjustments", label: "Inventory Adjustment" },
      { to: "/products/new", label: "Add New Product" },
    ],
  },
  {
    to: "/orders",
    label: "Orders",
    icon: "receipt",
    badge: "orders",
    children: [
      { to: "/orders", label: "All Orders", end: true, orderFilter: "all" },
      { to: "/orders?status=pending", label: "Pending Orders", orderFilter: "pending" },
      { to: "/orders?status=processing", label: "Processing Orders", orderFilter: "processing" },
      { to: "/orders?status=shipped", label: "Shipped Orders", orderFilter: "shipped" },
      { to: "/orders?status=delivered", label: "Delivered Orders", orderFilter: "delivered" },
      { to: "/orders?status=cancelled", label: "Cancelled Orders", orderFilter: "cancelled" },
      { to: "/orders?returns=1", label: "Order Returns", orderFilter: "returns" },
    ],
  },
  {
    to: "/customers",
    label: "Customers",
    icon: "users",
    children: [
      { to: "/customers", label: "All Customers", end: true, customerFilter: "all" },
      { to: "/customers?tab=groups", label: "Groups", customerFilter: "groups" },
      { to: "/customers?tab=segments", label: "Segments", customerFilter: "segments" },
      { to: "/customers?tab=blacklist", label: "Blacklist", customerFilter: "blacklist" },
      { to: "/customers?tab=activity", label: "Customer Activity", customerFilter: "activity" },
      { to: "/customers?tab=addresses", label: "Addresses", customerFilter: "addresses" },
    ],
  },
  {
    to: "/points",
    label: "Points & Rewards",
    icon: "star",
    children: [
      { to: "/points", label: "Overview", end: true, pointsFilter: "overview" },
      { to: "/points?tab=members", label: "Members", pointsFilter: "members" },
      { to: "/points?tab=transactions", label: "Points Transactions", pointsFilter: "transactions" },
      { to: "/points?tab=redeem", label: "Rewards", pointsFilter: "redeem" },
      { to: "/points?tab=tiers", label: "Tiers", pointsFilter: "tiers" },
      { to: "/points?tab=adjust", label: "Reward Claims", pointsFilter: "adjust" },
      { to: "/points?tab=rules", label: "Earn Rules", pointsFilter: "rules" },
      { to: "/points?tab=settings", label: "Settings", pointsFilter: "settings" },
    ],
  },
  {
    to: "/flash-drops",
    label: "Flash Drops",
    icon: "bolt",
    children: [
      { to: "/flash-drops", label: "All Flash Drops", end: true, flashFilter: "all" },
      { to: "/flash-drops/new", label: "Create Flash Drop", flashFilter: "create" },
      { to: "/flash-drops/new?schedule=1", label: "Schedule Drop", flashFilter: "schedule" },
      { to: "/flash-drops?tab=categories", label: "Drop Categories", flashFilter: "categories" },
      { to: "/flash-drops?tab=analytics", label: "Drop Analytics", flashFilter: "analytics" },
      { to: "/flash-drops?tab=participants", label: "Participants", flashFilter: "participants" },
      { to: "/flash-drops?tab=history", label: "Drop History", flashFilter: "history" },
      { to: "/flash-drops?tab=settings", label: "Drop Settings", flashFilter: "settings" },
      { to: "/flash-drops?tab=logs", label: "Drop Logs", flashFilter: "logs" },
      { to: "/flash-drops?tab=reports", label: "Reports & Export", flashFilter: "reports" },
      { to: "/flash-drops?tab=system", label: "System Settings", flashFilter: "system" },
    ],
  },
  { to: "/competitions", label: "Competitions", icon: "trophy" },
  {
    to: "/delivery",
    label: "Delivery",
    icon: "truck",
    children: [
      { to: "/delivery", label: "Overview", end: true, deliveryFilter: "overview" },
      { to: "/delivery?tab=shipments", label: "Shipments", deliveryFilter: "shipments" },
      { to: "/delivery?tab=couriers", label: "Couriers", deliveryFilter: "couriers" },
      { to: "/delivery?tab=zones", label: "Delivery Zones", deliveryFilter: "zones" },
      { to: "/delivery?tab=returns", label: "Returns", deliveryFilter: "returns" },
      { to: "/delivery?tab=settings", label: "Delivery Settings", deliveryFilter: "settings" },
    ],
  },
  { to: "/payments", label: "Payments", icon: "card" },
  {
    to: "/reports",
    label: "Reports",
    icon: "chart",
    children: [
      { to: "/reports?tab=delivery", label: "Delivery", reportsFilter: "delivery" },
      { to: "/reports?tab=sales", label: "Sales", reportsFilter: "sales" },
      { to: "/reports?tab=orders", label: "Orders", reportsFilter: "orders" },
      { to: "/reports?tab=customers", label: "Customers", reportsFilter: "customers" },
      { to: "/reports?tab=inventory", label: "Inventory", reportsFilter: "inventory" },
    ],
  },
  {
    to: "/marketing",
    label: "Marketing",
    icon: "megaphone",
    children: [
      { to: "/marketing", label: "Overview", end: true, marketingFilter: "overview" },
      { to: "/marketing?tab=campaigns", label: "Campaigns", marketingFilter: "campaigns" },
      { to: "/marketing?tab=email", label: "Email Marketing", marketingFilter: "email" },
      { to: "/marketing?tab=sms", label: "SMS Marketing", marketingFilter: "sms" },
      { to: "/marketing?tab=push", label: "Push Notifications", marketingFilter: "push" },
      { to: "/marketing?tab=discounts", label: "Discounts & Coupons", marketingFilter: "discounts" },
      { to: "/marketing?tab=banners", label: "Banners", marketingFilter: "banners" },
    ],
  },
  { to: "/support", label: "Support", icon: "help" },
  { to: "/settings", label: "Settings", icon: "gear" },
];

function prettyRole(role) {
  return (role || "Admin")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function classifySearch(raw) {
  const q = String(raw || "").trim();
  if (!q) return "empty";
  const compact = q.replace(/[\s()-]/g, "");
  if (
    /^(tajira|netza)\b/i.test(q) ||
    /^#?(TAJIRA|NETZA|ORD)[-_]/i.test(q) ||
    /^#?ord(er)?[-_\s]?\d/i.test(q) ||
    /^#?NZ[A-Z0-9]{5,}$/i.test(q)
  ) {
    return "order";
  }
  if (/@/.test(q) || /^(?:\+?254|0)\d{8,}$/.test(compact) || /^#?cust\b/i.test(q)) {
    return "customer";
  }
  return "product";
}

function searchPathFor(raw, pathname = "") {
  const q = String(raw || "").trim().replace(/^#/, "");
  const kind = classifySearch(raw);
  const encoded = encodeURIComponent(q);
  if (kind === "order") return `/orders?q=${encoded}`;
  if (kind === "customer") return `/customers?q=${encoded}`;
  if (pathname.startsWith("/customers")) return `/customers?q=${encoded}`;
  if (pathname.startsWith("/orders")) return `/orders?q=${encoded}`;
  return `/products?q=${encoded}`;
}

function customerLabel(c) {
  return `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || c.phone || "Customer";
}

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 960px)").matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia("(max-width: 960px)").matches);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({});
  const [badges, setBadges] = useState({ orders: 0, alerts: 0, mail: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [hits, setHits] = useState({ products: [], productTotal: 0, orders: [], orderTotal: 0, customers: [], customerTotal: 0 });
  const [activeHit, setActiveHit] = useState(-1);
  const searchRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchToken = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    function onChange(e) {
      const mobile = e.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    }
    onChange(mq);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    document.body.classList.toggle("sb-scroll-lock", isMobile && sidebarOpen);
    return () => document.body.classList.remove("sb-scroll-lock");
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    api("/admin/dashboard")
      .then((d) =>
        setBadges({
          orders: d.kpis?.pendingOrders || 0,
          alerts: d.kpis?.lowStock || 0,
          mail: Math.min(d.kpis?.ordersToday || 0, 9),
        })
      )
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const match = NAV
      .filter((item) => item.children && (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))
      .sort((a, b) => b.to.length - a.to.length)[0];
    setOpen(match ? { [match.to]: true } : {});
  }, [location.pathname]);

  function toggleNav(key) {
    setOpen((s) => (s[key] ? {} : { [key]: true }));
  }

  const displayName = useMemo(
    () => `${user?.firstName || "Admin"} ${user?.lastName || "User"}`.trim(),
    [user]
  );
  const initials = `${(user?.firstName || "A")[0]}${(user?.lastName || "U")[0]}`.toUpperCase();

  const hitItems = useMemo(() => {
    const items = [];
    hits.products.forEach((p) => items.push({ kind: "product", id: p.id, to: `/products/${p.id}` }));
    hits.orders.forEach((o) => items.push({ kind: "order", id: o.id, to: `/orders/${o.id}` }));
    hits.customers.forEach((c) => items.push({ kind: "customer", id: c.id, to: `/customers/${c.id}` }));
    return items;
  }, [hits]);

  function goSearch(path) {
    setSearchOpen(false);
    setActiveHit(-1);
    navigate(path);
  }

  function search(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeHit >= 0 && hitItems[activeHit]) {
      goSearch(hitItems[activeHit].to);
      return;
    }
    goSearch(searchPathFor(q, location.pathname));
  }

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      searchToken.current += 1;
      setHits({ products: [], productTotal: 0, orders: [], orderTotal: 0, customers: [], customerTotal: 0 });
      setSearchBusy(false);
      return undefined;
    }
    const token = ++searchToken.current;
    setSearchBusy(true);
    const timer = setTimeout(async () => {
      const enc = encodeURIComponent(q);
      const [products, orders, customers] = await Promise.allSettled([
        api(`/admin/products-catalog?q=${enc}&page=1&limit=5`),
        api(`/admin/orders?q=${enc}&page=1&limit=5`),
        api(`/admin/customers?q=${enc}&page=1&limit=5&tab=all`),
      ]);
      if (token !== searchToken.current) return;
      setHits({
        products: products.status === "fulfilled" ? (products.value.products || []).slice(0, 5) : [],
        productTotal: products.status === "fulfilled" ? products.value.total || 0 : 0,
        orders: orders.status === "fulfilled" ? (orders.value.orders || []).slice(0, 5) : [],
        orderTotal: orders.status === "fulfilled" ? orders.value.total || 0 : 0,
        customers: customers.status === "fulfilled" ? (customers.value.customers || []).slice(0, 5) : [],
        customerTotal: customers.status === "fulfilled" ? customers.value.total || 0 : 0,
      });
      setActiveHit(-1);
      setSearchBusy(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get("q") || "";
    if (fromUrl) setQuery(fromUrl);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onDoc(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
        setActiveHit(-1);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shellClass = [
    "app-shell",
    isMobile ? (sidebarOpen ? "is-sidebar-open" : "is-mobile") : (sidebarOpen ? "" : "is-collapsed"),
  ].filter(Boolean).join(" ");

  function closeSidebar() {
    if (isMobile) setSidebarOpen(false);
  }

  function toggleSidebar() {
    setSidebarOpen((v) => !v);
  }

  return (
    <div className={shellClass}>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="sb-backdrop"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}
      <aside className="sb">
        <div className="sb-brand">
          <img className="sb-mark" src="/tajira-logo.png" alt="Tajira" />
          <div>
            <div className="sb-logo">TAJIRA</div>
            <div className="sb-kenya">KENYA</div>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV.map((item) => {
            const expanded = Boolean(open[item.to]);
            const badge = item.badge === "orders" ? badges.orders : 0;
            return (
              <div key={item.to} className="sb-item">
                <div className="sb-row">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={closeSidebar}
                    className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                    {badge > 0 && <em className="sb-badge">{badge > 99 ? "99+" : badge}</em>}
                  </NavLink>
                  {item.children && (
                    <button
                      className={`sb-caret ${expanded ? "open" : ""}`}
                      onClick={() => toggleNav(item.to)}
                      type="button"
                      aria-label="Toggle submenu"
                    >
                      <Icon name="chevron" size={14} />
                    </button>
                  )}
                </div>
                {item.children && expanded && (
                  <div className="sb-sub">
                    {item.children.map((child) => {
                      if (child.orderFilter) {
                        const p = new URLSearchParams(location.search);
                        const onOrders = location.pathname === "/orders" || /^\/orders\/[^/]+$/.test(location.pathname);
                        let on = false;
                        if (child.orderFilter === "all") on = onOrders && !p.get("status") && p.get("returns") !== "1";
                        else if (child.orderFilter === "returns") on = onOrders && p.get("returns") === "1";
                        else on = onOrders && p.get("status") === child.orderFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.customerFilter) {
                        const p = new URLSearchParams(location.search);
                        const onProfile = /^\/customers\/[^/]+$/.test(location.pathname);
                        const onCust = location.pathname === "/customers" || onProfile;
                        const tab = p.get("tab") || "all";
                        const on = child.customerFilter === "all"
                          ? onCust && (onProfile || tab === "all")
                          : !onProfile && onCust && tab === child.customerFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.pointsFilter) {
                        const p = new URLSearchParams(location.search);
                        const onPts = location.pathname === "/points";
                        const tab = p.get("tab") || "overview";
                        const on = onPts && tab === child.pointsFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.deliveryFilter) {
                        const p = new URLSearchParams(location.search);
                        const onDlv = location.pathname === "/delivery";
                        const tab = p.get("tab") || "overview";
                        const on = onDlv && tab === child.deliveryFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.reportsFilter) {
                        const p = new URLSearchParams(location.search);
                        const onRpt =
                          location.pathname === "/reports" || location.pathname.startsWith("/reports/");
                        const tab =
                          location.pathname === "/reports/delivery"
                            ? "delivery"
                            : p.get("tab") || "delivery";
                        const on = onRpt && tab === child.reportsFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.marketingFilter) {
                        const p = new URLSearchParams(location.search);
                        const onMkt = location.pathname === "/marketing";
                        const tab = p.get("tab") || "overview";
                        const on = onMkt && tab === child.marketingFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      if (child.flashFilter) {
                        const p = new URLSearchParams(location.search);
                        const onFd = location.pathname === "/flash-drops";
                        const onNew = location.pathname === "/flash-drops/new";
                        const onEdit = /\/flash-drops\/[^/]+\/edit$/.test(location.pathname);
                        const tab = p.get("tab") || "all";
                        const isNew = p.get("new") === "1";
                        const action = p.get("action") || "";
                        const isSchedule = p.get("schedule") === "1" || action === "schedule";
                        let on = false;
                        if (child.flashFilter === "all") on = onFd && !isNew && !action && (tab === "all" || !p.get("tab"));
                        else if (child.flashFilter === "create") on = (onNew && !isSchedule) || onEdit || (onFd && isNew && !isSchedule);
                        else if (child.flashFilter === "schedule") on = (onNew && isSchedule) || (onFd && action === "schedule");
                        else on = onFd && !isNew && !action && tab === child.flashFilter;
                        return (
                          <Link
                            key={child.to + child.label}
                            to={child.to}
                            onClick={closeSidebar}
                            className={`sb-sublink ${on ? "active" : ""}`}
                            aria-current={on ? "page" : undefined}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      return (
                        <NavLink
                          key={child.to + child.label}
                          to={child.to}
                          end={child.end}
                          onClick={closeSidebar}
                          className={({ isActive }) => `sb-sublink ${isActive ? "active" : ""}`}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sb-quick">
          <div className="sb-quick-label">Quick Actions</div>
          {location.pathname.startsWith("/products") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => navigate("/products/new")}>
                <Icon name="plus" size={14} /> Add New Product
              </button>
              <button className="sb-act blue" type="button" onClick={() => navigate("/products/import")}>
                <Icon name="upload" size={14} /> Import Products
              </button>
              <button className="sb-act green" type="button" onClick={() => navigate("/products?export=1")}>
                <Icon name="download" size={14} /> Export Products
              </button>
            </>
          ) : location.pathname.startsWith("/orders") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => navigate("/orders")}>
                <Icon name="plus" size={14} /> Create Order
              </button>
              <button className="sb-act blue" type="button" onClick={() => navigate("/orders")}>
                <Icon name="upload" size={14} /> Import Orders
              </button>
              <button className="sb-act green" type="button" onClick={() => navigate("/orders")}>
                <Icon name="download" size={14} /> Export Orders
              </button>
            </>
          ) : location.pathname.startsWith("/points") ? (
            new URLSearchParams(location.search).get("tab") === "transactions" ? (
              <>
                <button className="sb-act purple" type="button" onClick={() => navigate("/points?tab=adjust")}>
                  <Icon name="plus" size={14} /> Award Points
                </button>
                <button className="sb-act outline" type="button" onClick={() => navigate("/points?tab=adjust")}>
                  <Icon name="minus" size={14} /> Deduct Points
                </button>
                <button className="sb-act outline" type="button" onClick={() => window.alert("Export transactions coming soon")}>
                  <Icon name="download" size={14} /> Export Transactions
                </button>
              </>
            ) : (
              <>
                <button className="sb-act purple" type="button" onClick={() => navigate("/points?tab=redeem")}>
                  <Icon name="plus" size={14} /> Add Reward
                </button>
                <button className="sb-act outline" type="button" onClick={() => navigate("/points?tab=members")}>
                  <Icon name="upload" size={14} /> Import Members
                </button>
                <button className="sb-act outline" type="button" onClick={() => navigate("/points")}>
                  <Icon name="download" size={14} /> Export Data
                </button>
              </>
            )
          ) : location.pathname.startsWith("/delivery") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => window.alert("Create shipment form coming soon")}>
                <Icon name="plus" size={14} /> Create Shipment
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/delivery?tab=couriers")}>
                <Icon name="truck" size={14} /> Manage Couriers
              </button>
              <button className="sb-act outline" type="button" onClick={() => window.alert("Export shipments coming soon")}>
                <Icon name="download" size={14} /> Export Shipments
              </button>
            </>
          ) : location.pathname.startsWith("/reports") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => window.alert("Custom report builder coming soon")}>
                <Icon name="plus" size={14} /> Custom Report
              </button>
              <button className="sb-act outline" type="button" onClick={() => window.alert("Export started")}>
                <Icon name="download" size={14} /> Export Report
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/delivery")}>
                <Icon name="truck" size={14} /> Delivery Overview
              </button>
            </>
          ) : location.pathname.startsWith("/marketing") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => navigate("/marketing?tab=campaigns&new=1")}>
                <Icon name="plus" size={14} /> Create Campaign
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/marketing?tab=discounts&new=1")}>
                <Icon name="tag" size={14} /> Create Discount
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/marketing?tab=banners&new=1")}>
                <Icon name="upload" size={14} /> Upload Banner
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/marketing?tab=email&templates=1")}>
                <Icon name="layers" size={14} /> View Templates
              </button>
            </>
          ) : location.pathname.startsWith("/support") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => navigate("/support?new=1")}>
                <Icon name="plus" size={14} /> New Ticket
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/customers")}>
                <Icon name="users" size={14} /> Customers
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/orders")}>
                <Icon name="receipt" size={14} /> Orders
              </button>
            </>
          ) : location.pathname.startsWith("/settings") ? (
            <>
              <button className="sb-act purple" type="button" onClick={() => navigate("/settings")}>
                <Icon name="save" size={14} /> Save Settings
              </button>
              <button className="sb-act outline" type="button" onClick={() => navigate("/support")}>
                <Icon name="help" size={14} /> Support
              </button>
            </>
          ) : (
            <>
              <button
                className="sb-act purple"
                type="button"
                onClick={() => navigate(location.pathname === "/customers" ? "/customers?new=1" : "/products/new")}
              >
                <Icon name="plus" size={14} /> {location.pathname === "/customers" ? "Add Customer" : "Add Product"}
              </button>
              <button className="sb-act green" type="button" onClick={() => navigate("/flash-drops/new")}>
                <Icon name="bolt" size={14} /> Create Flash Drop
              </button>
              <button className="sb-act orange" type="button" onClick={() => navigate("/competitions/new")}>
                <Icon name="trophy" size={14} /> New Competition
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="workspace">
        <header className="top-header">
          <button className="icon-btn menu-toggle" type="button" onClick={toggleSidebar} aria-label="Toggle menu" aria-expanded={sidebarOpen}>
            <Icon name="menu" />
          </button>
          <div className="top-search-wrap" ref={searchBoxRef}>
          <form className="top-search" onSubmit={search}>
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setActiveHit(-1);
                  searchRef.current?.blur();
                  return;
                }
                if (e.key === "ArrowDown" && hitItems.length) {
                  e.preventDefault();
                  setSearchOpen(true);
                  setActiveHit((i) => (i + 1) % hitItems.length);
                }
                if (e.key === "ArrowUp" && hitItems.length) {
                  e.preventDefault();
                  setSearchOpen(true);
                  setActiveHit((i) => (i <= 0 ? hitItems.length - 1 : i - 1));
                }
              }}
              placeholder="Search products, SKU, orders..."
              aria-label="Search products, SKU, and orders"
              autoComplete="off"
            />
            <kbd className="search-kbd">Ctrl + K</kbd>
          </form>
          {searchOpen && query.trim().length >= 2 && (
            <div className="top-search-panel" role="listbox">
              {searchBusy && !hits.products.length && !hits.orders.length && !hits.customers.length ? (
                <div className="top-search-empty">Searching products, SKUs and orders…</div>
              ) : (
                <>
                  <section>
                    <header>
                      <span>Products &amp; SKUs</span>
                      {hits.productTotal > 0 && <em>{hits.productTotal}</em>}
                    </header>
                    {hits.products.length === 0 ? (
                      <p className="top-search-empty">No matching products or SKUs</p>
                    ) : hits.products.map((p) => {
                      const idx = hitItems.findIndex((h) => h.kind === "product" && h.id === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`top-search-hit ${idx === activeHit ? "is-active" : ""}`}
                          onMouseEnter={() => setActiveHit(idx)}
                          onClick={() => goSearch(`/products/${p.id}`)}
                        >
                          {p.image ? <img src={mediaUrl(p.image)} alt="" /> : <span className="top-search-ph"><Icon name="box" size={14} /></span>}
                          <span>
                            <strong>{p.name}</strong>
                            <small>{[p.sku, p.category].filter(Boolean).join(" · ")}</small>
                          </span>
                          <b>{kes(p.priceKes)}</b>
                        </button>
                      );
                    })}
                    <button type="button" className="top-search-more" onClick={() => goSearch(`/products?q=${encodeURIComponent(query.trim())}`)}>
                      View all product results
                    </button>
                  </section>
                  <section>
                    <header>
                      <span>Orders</span>
                      {hits.orderTotal > 0 && <em>{hits.orderTotal}</em>}
                    </header>
                    {hits.orders.length === 0 ? (
                      <p className="top-search-empty">No matching orders</p>
                    ) : hits.orders.map((o) => {
                      const idx = hitItems.findIndex((h) => h.kind === "order" && h.id === o.id);
                      const name = `${o.user?.firstName || ""} ${o.user?.lastName || ""}`.trim() || "Guest";
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`top-search-hit ${idx === activeHit ? "is-active" : ""}`}
                          onMouseEnter={() => setActiveHit(idx)}
                          onClick={() => goSearch(`/orders/${o.id}`)}
                        >
                          <span className="top-search-ph"><Icon name="receipt" size={14} /></span>
                          <span>
                            <strong>{o.orderNumber || o.id}</strong>
                            <small>{name}</small>
                          </span>
                          <b>{kes(o.totalKes)}</b>
                        </button>
                      );
                    })}
                    <button type="button" className="top-search-more" onClick={() => goSearch(`/orders?q=${encodeURIComponent(query.trim())}`)}>
                      View all order results
                    </button>
                  </section>
                  {hits.customers.length > 0 && (
                    <section>
                      <header>
                        <span>Customers</span>
                        {hits.customerTotal > 0 && <em>{hits.customerTotal}</em>}
                      </header>
                      {hits.customers.map((c) => {
                        const idx = hitItems.findIndex((h) => h.kind === "customer" && h.id === c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`top-search-hit ${idx === activeHit ? "is-active" : ""}`}
                            onMouseEnter={() => setActiveHit(idx)}
                            onClick={() => goSearch(`/customers/${c.id}`)}
                          >
                            <span className="top-search-ph"><Icon name="users" size={14} /></span>
                            <span>
                              <strong>{customerLabel(c)}</strong>
                              <small>{c.phone || c.email || c.customerNumber}</small>
                            </span>
                          </button>
                        );
                      })}
                    </section>
                  )}
                </>
              )}
            </div>
          )}
          </div>
          <div className="top-actions">
            <button className="icon-btn" type="button" title="Notifications" onClick={() => navigate("/orders")}>
              <Icon name="bell" />
              {badges.alerts > 0 && <span className="dot-badge">{badges.alerts}</span>}
            </button>
            <button className="icon-btn" type="button" title="Messages" onClick={() => navigate("/orders")}>
              <Icon name="mail" />
              {badges.mail > 0 && <span className="dot-badge">{badges.mail}</span>}
            </button>
            <button className="icon-btn" type="button" title="Help" onClick={() => window.alert("Need help with the catalog? Email support@tajira.co.ke")}>
              <Icon name="help" />
            </button>
            <div className="top-user">
              {user?.avatarUrl ? (
                <img className="avatar avatar-img" src={user.avatarUrl} alt="" />
              ) : (
                <div className="avatar">{initials}</div>
              )}
              <div className="top-user-meta">
                <div className="top-user-name">{displayName}</div>
                <div className="top-user-role">{prettyRole(user?.role)}</div>
              </div>
              <button
                className="btn btn-ghost btn-small top-signout"
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <div className="workspace-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
