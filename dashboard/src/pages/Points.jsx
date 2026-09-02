import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Icon } from "../icons";
import PointsOverview from "./PointsOverview";
import PointsMembers from "./PointsMembers";
import PointsTransactions from "./PointsTransactions";
import PointsRewards from "./PointsRewards";
import PointsTiers from "./PointsTiers";
import PointsSettings from "./PointsSettings";

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function fmtTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function initials(c) {
  return `${(c?.firstName || "C")[0]}${(c?.lastName || "U")[0]}`.toUpperCase();
}

function fullName(c) {
  return `${c?.firstName || ""} ${c?.lastName || ""}`.trim() || "Customer";
}

function kindCls(kind) {
  if (kind === "redeem") return "pts-kind-redeem";
  if (kind === "adjust") return "pts-kind-adjust";
  if (kind === "expire") return "pts-kind-expire";
  return "pts-kind-earn";
}

function trendText(pct) {
  const n = Number(pct) || 0;
  const arrow = n >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(n).toFixed(1)}% vs last month`;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Point Transactions" },
  { id: "rules", label: "Earn Rules" },
  { id: "redeem", label: "Redeem Rewards" },
  { id: "adjust", label: "Adjust Points" },
  { id: "expiry", label: "Expiry Management" },
  { id: "settings", label: "Settings" },
];

const CRUMB = Object.fromEntries(TABS.map((t) => [t.id, t.label]));

const STATS = [
  { key: "issued", label: "Total Points Issued", pct: "issuedPct", icon: "coin", tone: "gold" },
  { key: "redeemed", label: "Points Redeemed", pct: "redeemedPct", icon: "users", tone: "purple" },
  { key: "earnedThisMonth", label: "Points Earned (This Month)", pct: "earnedPct", icon: "star", tone: "green" },
  { key: "available", label: "Available Holder", hint: "Across all customers", icon: "gift", tone: "orange" },
];

const RULE_TYPES = [
  { id: "purchase", label: "Purchase" },
  { id: "engagement", label: "Engagement" },
  { id: "referral", label: "Referral" },
  { id: "promotion", label: "Promotion" },
  { id: "competition", label: "Competition" },
  { id: "special", label: "Special" },
];

const TRIGGERS = [
  { id: "amount_spent", label: "Every amount spent" },
  { id: "first_purchase", label: "First purchase" },
  { id: "daily_login", label: "Daily login" },
  { id: "login_streak", label: "Login streak" },
  { id: "referral_signup", label: "New user registers via referral" },
  { id: "product_review", label: "Product review" },
  { id: "complete_profile", label: "Complete profile" },
  { id: "photo_upload", label: "Installation photo" },
  { id: "signup", label: "New account created" },
  { id: "birthday", label: "Customer birthday" },
  { id: "competition_entry", label: "Competition entry" },
  { id: "competition_win", label: "Competition win" },
];

const LIMITS = [
  { id: "none", label: "No limit" },
  { id: "once", label: "Once" },
  { id: "once_per_day", label: "Once per day" },
  { id: "once_per_week", label: "Once per week" },
  { id: "once_per_year", label: "Once per year" },
];

const emptyRule = {
  name: "",
  ruleType: "purchase",
  trigger: "amount_spent",
  conditionValue: "100",
  points: "1",
  limit: "none",
  priority: "10",
  isActive: true,
  description: "",
};

const REWARD_CATS = [
  { id: "", label: "All Rewards" },
  { id: "voucher", label: "Coupons / Vouchers" },
  { id: "product", label: "Products" },
  { id: "shipping", label: "Free Shipping" },
  { id: "experience", label: "Experiences" },
  { id: "donation", label: "Donations" },
];

const REWARD_GROUPS = ["General", "Networking", "CCTV", "Access Control", "Cabling", "Power", "Promotions", "Community"];

const emptyReward = {
  name: "",
  description: "",
  category: "voucher",
  group: "General",
  points: "1000",
  stock: "",
  unlimited: true,
  startsAt: "",
  endsAt: "",
  isActive: true,
  priority: "1",
  imageUrl: "",
};

function rewardCatMeta(cat) {
  const t = String(cat || "voucher").toLowerCase();
  if (t === "product") return { label: "Product", cls: "rwd-cat-product", icon: "bag", tone: "blue" };
  if (t === "shipping") return { label: "Free Shipping", cls: "rwd-cat-shipping", icon: "truck", tone: "orange" };
  if (t === "experience") return { label: "Experience", cls: "rwd-cat-experience", icon: "trophy", tone: "green" };
  if (t === "donation") return { label: "Donation", cls: "rwd-cat-donation", icon: "heart", tone: "gold" };
  return { label: "Voucher", cls: "rwd-cat-voucher", icon: "gift", tone: "purple" };
}

function stockText(r) {
  if (r.stock == null || r.stock < 0) return "Unlimited";
  return `${fmtNum(r.stock)} units`;
}

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tz = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(tz).toISOString().slice(0, 10);
}

function fmtKes(n) {
  return `KSh ${fmtNum(n || 0)}`;
}

function groupCls(level) {
  const l = String(level || "BRONZE").toUpperCase();
  if (l === "PLATINUM") return "grp-platinum";
  if (l === "GOLD") return "grp-gold";
  if (l === "SILVER") return "grp-silver";
  return "grp-bronze";
}

function groupLabel(level) {
  const l = String(level || "BRONZE").toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function daysBadge(days, status) {
  if (status === "expired" || days == null || days < 0) return { text: "Expired", cls: "exp-days-dead" };
  if (days <= 7) return { text: `${days} day${days === 1 ? "" : "s"}`, cls: "exp-days-warn" };
  return { text: `${days} days`, cls: "exp-days-ok" };
}

function expiryStatusMeta(status) {
  if (status === "expired") return { label: "Expired", cls: "exp-st-expired" };
  if (status === "soon") return { label: "Expiring Soon", cls: "exp-st-soon" };
  return { label: "Active", cls: "exp-st-active" };
}

const EXP_INNER = [
  { id: "all", label: "All Expiry" },
  { id: "soon", label: "Expiring Soon" },
  { id: "expired", label: "Expired" },
  { id: "rules", label: "Expiry Rules" },
  { id: "history", label: "Expiry History" },
  { id: "reminders", label: "Reminder History" },
  { id: "settings", label: "Settings" },
];

function ruleTypeMeta(type) {
  const t = String(type || "engagement").toLowerCase();
  if (t === "purchase") return { label: "Purchase", cls: "rule-type-purchase", icon: "bag", tone: "purple" };
  if (t === "referral") return { label: "Referral", cls: "rule-type-referral", icon: "users", tone: "orange" };
  if (t === "promotion") return { label: "Promotion", cls: "rule-type-promotion", icon: "gift", tone: "green" };
  if (t === "competition") return { label: "Competition", cls: "rule-type-competition", icon: "trophy", tone: "gold" };
  if (t === "special") return { label: "Special", cls: "rule-type-special", icon: "bolt", tone: "indigo" };
  return { label: "Engagement", cls: "rule-type-engagement", icon: "star", tone: "blue" };
}

function triggerText(r) {
  const found = TRIGGERS.find((t) => t.id === r.trigger);
  if (r.trigger === "amount_spent") return `Every KSh ${r.conditionValue || 100} spent`;
  if (r.trigger === "login_streak") return `${r.conditionValue || 7}-day login streak`;
  return found?.label || r.trigger || "—";
}

function limitText(id) {
  return LIMITS.find((l) => l.id === id)?.label || "No limit";
}

const emptyAdjust = { userId: "", points: "100", kind: "adjust", note: "", reference: "" };

export default function Points() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const importRef = useRef(null);

  const [data, setData] = useState({
    transactions: [],
    stats: {},
    summary: {},
    leaders: [],
    rules: [],
    rewards: [],
    customers: [],
    expiring: [],
    settings: { expiryDays: 365, kesPerPoint: 10, expiryType: "automatic", minBalance: 100, autoExpiry: true, remindersEnabled: true },
    total: 0,
  });
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyAdjust);
  const [detail, setDetail] = useState(null);
  const [showLeaders, setShowLeaders] = useState(false);
  const [settings, setSettings] = useState({ expiryDays: 365, kesPerPoint: 10, expiryType: "automatic", minBalance: 100, autoExpiry: true, remindersEnabled: true });
  const [rules, setRules] = useState([]);
  const [ruleQ, setRuleQ] = useState("");
  const [ruleTypeF, setRuleTypeF] = useState("");
  const [ruleStatusF, setRuleStatusF] = useState("");
  const [ruleTriggerF, setRuleTriggerF] = useState("");
  const [ruleOpen, setRuleOpen] = useState(null);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [ruleMenu, setRuleMenu] = useState(null);
  const [rewardQ, setRewardQ] = useState("");
  const [rewardCat, setRewardCat] = useState("");
  const [rewardStatusF, setRewardStatusF] = useState("");
  const [rewardSort, setRewardSort] = useState("popular");
  const [rewardPage, setRewardPage] = useState(1);
  const [rewardLimit, setRewardLimit] = useState(8);
  const [rewardOpen, setRewardOpen] = useState("new");
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [rewardMenu, setRewardMenu] = useState(null);
  const [expInner, setExpInner] = useState("all");
  const [expQ, setExpQ] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [expStatusF, setExpStatusF] = useState("");
  const [expSource, setExpSource] = useState("");
  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");
  const [expPage, setExpPage] = useState(1);
  const [expLimit, setExpLimit] = useState(10);
  const [expMenu, setExpMenu] = useState(null);
  const rewardImportRef = useRef(null);

  function queryString(extra = {}) {
    const p = new URLSearchParams();
    const vals = {
      q: extra.q ?? q,
      type: extra.type ?? type,
      customer: extra.customer ?? customer,
      status: extra.status ?? status,
      from: extra.from ?? from,
      to: extra.to ?? to,
      page: extra.page ?? page,
      limit: extra.limit ?? limit,
    };
    Object.entries(vals).forEach(([k, v]) => {
      if (v !== "" && v != null) p.set(k, String(v));
    });
    return p.toString();
  }

  function load(extra = {}) {
    api(`/admin/points?${queryString(extra)}`)
      .then((d) => {
        setData(d);
        setRules(d.rules || []);
        setSettings(d.settings || { expiryDays: 365, kesPerPoint: 10, expiryType: "automatic", minBalance: 100, autoExpiry: true, remindersEnabled: true });
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load({ page: 1 });
    setPage(1);
    setRuleOpen(null);
    setRuleMenu(null);
    setRewardMenu(null);
    setRewardPage(1);
    setExpMenu(null);
    setExpPage(1);
    if (tab === "redeem") {
      setRewardOpen("new");
      setRewardForm(emptyReward);
    }
    if (tab === "expiry") setExpInner("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const txns = data.transactions || [];
  const stats = data.stats || {};
  const summary = data.summary || {};
  const total = data.total || 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const fromN = total === 0 ? 0 : (page - 1) * limit + 1;
  const toN = Math.min(page * limit, total);
  const crumb = CRUMB[tab] || "Overview";
  const showTable = tab === "overview" || tab === "transactions" || tab === "adjust";
  const showWidgets = tab === "overview";

  const pageButtons = useMemo(() => {
    const maxBtns = Math.min(pages, 5);
    let start = Math.max(1, Math.min(page - 2, pages - maxBtns + 1));
    const list = [];
    for (let i = 0; i < maxBtns; i += 1) list.push(start + i);
    return list;
  }, [page, pages]);

  function setTab(id) {
    const next = new URLSearchParams(params);
    if (!id || id === "overview") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  }

  function apply(e) {
    e?.preventDefault();
    setPage(1);
    load({ page: 1 });
  }

  function reset() {
    setQ("");
    setType("");
    setCustomer("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
    load({ q: "", type: "", customer: "", status: "", from: "", to: "", page: 1 });
  }

  function openModal(kind) {
    setForm({ ...emptyAdjust, kind, points: kind === "redeem" || kind === "expire" ? "100" : "100" });
    setModal(kind);
  }

  async function submitAdjust(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/points/adjust", {
        method: "POST",
        body: JSON.stringify({
          userId: form.userId,
          points: Number(form.points),
          kind: form.kind,
          note: form.note,
          reference: form.reference,
        }),
      });
      setModal(null);
      setForm(emptyAdjust);
      setToast("Points updated");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    const d = await api(`/admin/points?${queryString({ page: 1, limit: 200 })}`);
    const rows = [
      ["Date", "Customer", "ID", "Type", "Description", "Reference", "Points", "Balance", "Status"],
      ...(d.transactions || []).map((t) => [
        t.createdAt,
        fullName(t.customer),
        t.customer?.customerNumber || "",
        t.kindLabel,
        t.description || "",
        t.reference || "",
        t.points,
        t.balanceAfter,
        t.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-points-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      let items = [];
      if (text.trim().startsWith("[")) items = JSON.parse(text);
      else {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase());
        items = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replaceAll('"', ""));
          const row = {};
          headers.forEach((h, i) => {
            row[h] = cols[i];
          });
          return {
            phone: row.phone,
            customerNumber: row.customernumber || row.customer || row.id,
            points: Number(row.points),
            kind: (row.kind || row.type || "adjust").toLowerCase(),
            note: row.note || row.description,
            reference: row.reference || row.ref,
          };
        });
      }
      const d = await api("/admin/points/bulk", { method: "POST", body: JSON.stringify({ items }) });
      setToast(`Uploaded ${d.created} point rows`);
      load();
    } catch (err) {
      setError(err.message || "Could not import that file.");
    }
  }

  async function saveRule(rule) {
    await api(`/admin/points-rules/${rule.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: rule.name,
        points: Number(rule.points),
        isActive: rule.isActive,
        configJson: rule.configJson,
        ruleType: rule.ruleType,
        trigger: rule.trigger,
        conditionValue: rule.conditionValue,
        limit: rule.limit,
        priority: Number(rule.priority),
        description: rule.description,
      }),
    });
    setToast("Rule saved");
    load();
  }

  function openNewRule() {
    setRuleForm(emptyRule);
    setRuleOpen("new");
    setRuleMenu(null);
  }

  function openEditRule(r) {
    setRuleForm({
      name: r.name || "",
      ruleType: r.ruleType || "engagement",
      trigger: r.trigger || "",
      conditionValue: r.conditionValue || "",
      points: String(r.points ?? 0),
      limit: r.limit || "none",
      priority: String(r.priority || 10),
      isActive: r.isActive !== false,
      description: r.description || "",
    });
    setRuleOpen(r.id);
    setRuleMenu(null);
  }

  async function submitRule(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: ruleForm.name,
        points: Number(ruleForm.points),
        isActive: ruleForm.isActive,
        ruleType: ruleForm.ruleType,
        trigger: ruleForm.trigger,
        conditionValue: ruleForm.conditionValue,
        limit: ruleForm.limit,
        priority: Number(ruleForm.priority),
        description: ruleForm.description,
      };
      if (ruleOpen && ruleOpen !== "new") {
        await api(`/admin/points-rules/${ruleOpen}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast("Rule saved");
      } else {
        await api("/admin/points-rules", { method: "POST", body: JSON.stringify(payload) });
        setToast("Rule created");
      }
      setRuleOpen(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(r) {
    await api(`/admin/points-rules/${r.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    load();
  }

  async function duplicateRule(r) {
    await api("/admin/points-rules", {
      method: "POST",
      body: JSON.stringify({
        name: `${r.name} (copy)`,
        points: r.points,
        isActive: false,
        ruleType: r.ruleType,
        trigger: r.trigger,
        conditionValue: r.conditionValue,
        limit: r.limit,
        priority: r.priority || 10,
        description: r.description,
      }),
    });
    setRuleMenu(null);
    setToast("Rule duplicated");
    load();
  }

  function exportRules() {
    const rows = [
      ["Name", "Type", "Trigger", "Points", "Limit", "Status", "Priority"],
      ...earnRules.map((r) => [
        r.name,
        r.ruleType,
        triggerText(r),
        r.points,
        limitText(r.limit),
        r.isActive ? "Active" : "Inactive",
        r.priority,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-earn-rules.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openNewReward() {
    setRewardForm(emptyReward);
    setRewardOpen("new");
    setRewardMenu(null);
  }

  function openEditReward(r) {
    setRewardForm({
      name: r.name || "",
      description: r.description || "",
      category: r.category || "voucher",
      group: r.conditionValue || "General",
      points: String(r.points ?? 0),
      stock: r.stock != null && r.stock >= 0 ? String(r.stock) : "",
      unlimited: r.stock == null || r.stock < 0,
      startsAt: toDateInput(r.startsAt),
      endsAt: toDateInput(r.endsAt),
      isActive: r.isActive !== false,
      priority: String(r.priority || 1),
      imageUrl: r.imageUrl || "",
    });
    setRewardOpen(r.id);
    setRewardMenu(null);
  }

  function rewardPayload() {
    return {
      name: rewardForm.name,
      points: Number(rewardForm.points),
      isActive: rewardForm.isActive,
      ruleType: "redeem",
      trigger: "redeem",
      category: rewardForm.category,
      conditionValue: rewardForm.group,
      description: rewardForm.description,
      priority: Number(rewardForm.priority) || 1,
      stock: rewardForm.unlimited ? -1 : Number(rewardForm.stock || 0),
      imageUrl: rewardForm.imageUrl || "",
      startsAt: rewardForm.startsAt || null,
      endsAt: rewardForm.endsAt || null,
    };
  }

  async function submitReward(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = rewardPayload();
      if (rewardOpen && rewardOpen !== "new") {
        await api(`/admin/points-rules/${rewardOpen}`, { method: "PATCH", body: JSON.stringify(payload) });
        setToast("Reward saved");
      } else {
        await api("/admin/points-rules", { method: "POST", body: JSON.stringify(payload) });
        setToast("Reward created");
      }
      setRewardForm(emptyReward);
      setRewardOpen("new");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicateReward(r) {
    await api("/admin/points-rules", {
      method: "POST",
      body: JSON.stringify({
        name: `${r.name} (copy)`,
        points: r.points,
        isActive: false,
        ruleType: "redeem",
        trigger: "redeem",
        category: r.category,
        conditionValue: r.conditionValue,
        description: r.description,
        priority: r.priority || 10,
        stock: r.stock ?? -1,
        imageUrl: r.imageUrl || "",
      }),
    });
    setRewardMenu(null);
    setToast("Reward duplicated");
    load();
  }

  function exportRewards() {
    const rows = [
      ["Name", "Type", "Category", "Points", "Stock", "Redeemed", "Status", "Priority", "Description"],
      ...redeemRules.map((r) => [
        r.name,
        rewardCatMeta(r.category).label,
        r.conditionValue || "General",
        r.points,
        r.stock == null || r.stock < 0 ? "Unlimited" : r.stock,
        r.redeemedCount || 0,
        r.isActive !== false ? "Active" : "Inactive",
        r.priority,
        r.description || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-redeem-rewards.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importRewards(file) {
    if (!file) return;
    try {
      const text = await file.text();
      let items = [];
      if (text.trim().startsWith("[")) items = JSON.parse(text);
      else {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase().replaceAll('"', ""));
        items = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replaceAll('"', ""));
          const row = {};
          headers.forEach((h, i) => {
            row[h] = cols[i];
          });
          const type = (row.type || row.category || "voucher").toLowerCase();
          const cat = ["voucher", "product", "shipping", "experience", "donation"].includes(type)
            ? type
            : type.includes("ship")
              ? "shipping"
              : type.includes("product")
                ? "product"
                : type.includes("experience")
                  ? "experience"
                  : type.includes("donat")
                    ? "donation"
                    : "voucher";
          const stockRaw = String(row.stock || "").toLowerCase();
          return {
            name: row.name || row.reward,
            points: Number(row.points || row.cost || 0),
            isActive: String(row.status || "active").toLowerCase() !== "inactive",
            ruleType: "redeem",
            trigger: "redeem",
            category: cat,
            conditionValue: row.group || row["catalog category"] || "General",
            description: row.description || "",
            priority: Number(row.priority || 10),
            stock: stockRaw === "unlimited" || stockRaw === "" ? -1 : Number(row.stock),
            imageUrl: row.image || row.imageurl || "",
          };
        });
      }
      let created = 0;
      for (const item of items) {
        if (!item.name) continue;
        await api("/admin/points-rules", { method: "POST", body: JSON.stringify(item) });
        created += 1;
      }
      setToast(`Imported ${created} rewards`);
      load();
    } catch (err) {
      setError(err.message || "Could not import that file.");
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/points/settings", {
        method: "PATCH",
        body: JSON.stringify({
          expiryDays: Number(settings.expiryDays),
          kesPerPoint: Number(settings.kesPerPoint),
          expiryType: settings.expiryType || "automatic",
          minBalance: Number(settings.minBalance || 0),
          autoExpiry: settings.autoExpiry !== false,
          remindersEnabled: settings.remindersEnabled !== false,
        }),
      });
      setToast("Settings saved");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function expireOne(id) {
    await api("/admin/points/expire", { method: "POST", body: JSON.stringify({ txnId: id }) });
    setToast("Points expired");
    load();
  }

  async function runExpiry() {
    const d = await api("/admin/points/expire", { method: "POST", body: JSON.stringify({ run: true }) });
    setToast(`Expired ${d.expired} batches`);
    load();
  }

  async function sendReminders(txnId) {
    const d = await api("/admin/points/reminders", {
      method: "POST",
      body: JSON.stringify(txnId ? { txnId } : { allSoon: true }),
    });
    setExpMenu(null);
    setToast(`Sent ${d.sent} expiry reminder${d.sent === 1 ? "" : "s"}`);
    load();
  }

  function exportExpiry() {
    const rows = [
      ["Customer", "Email", "Phone", "Membership", "Current Points", "Points Expiring", "Expiry Date", "Days Left", "Source", "Reference", "Status"],
      ...expiryRows.map((t) => [
        fullName(t.customer),
        t.customer?.email || "",
        t.customer?.phone || "",
        t.customer?.membershipLevel || "",
        t.customer?.pointsBalance || 0,
        t.points,
        t.expiresAt,
        t.daysLeft,
        t.sourceLabel,
        t.reference || "",
        t.expiryStatus,
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tajira-points-expiry.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const tableTxns = tab === "adjust" ? txns.filter((t) => t.kind === "adjust") : txns;
  const earnRules = rules.filter((r) => !String(r.key || "").startsWith("REDEEM_") && r.ruleType !== "redeem");
  const redeemRules = rules.filter((r) => String(r.key || "").startsWith("REDEEM_") || r.ruleType === "redeem");
  const filteredRules = earnRules.filter((r) => {
    if (ruleQ && !`${r.name} ${r.description || ""} ${r.key || ""}`.toLowerCase().includes(ruleQ.trim().toLowerCase())) return false;
    if (ruleTypeF && r.ruleType !== ruleTypeF) return false;
    if (ruleStatusF === "active" && r.isActive === false) return false;
    if (ruleStatusF === "inactive" && r.isActive !== false) return false;
    if (ruleTriggerF && r.trigger !== ruleTriggerF) return false;
    return true;
  });
  const ruleTotal = filteredRules.length;
  const rulePages = Math.max(1, Math.ceil(ruleTotal / limit));
  const pagedRules = filteredRules.slice((page - 1) * limit, page * limit);
  const ruleFrom = ruleTotal === 0 ? 0 : (page - 1) * limit + 1;
  const ruleTo = Math.min(page * limit, ruleTotal);
  const activeRules = earnRules.filter((r) => r.isActive !== false).length;
  const inactiveRules = earnRules.length - activeRules;
  const showDrawer = tab === "rules" && Boolean(ruleOpen);
  const showRewardPanel = tab === "redeem";
  const showExpiryPanel = tab === "expiry";
  const expiry = data.expiry || { stats: {}, buckets: {}, trend: [], rows: [], reminders: [], rules: [] };
  const expStats = expiry.stats || {};
  const expKes = Number(settings.kesPerPoint || expStats.kesPerPoint || 10);
  const expiryRows = expiry.rows || [];
  const filteredExpiry = expiryRows.filter((t) => {
    const c = t.customer || {};
    if (expInner === "soon" && t.expiryStatus === "expired") return false;
    if (expInner === "soon" && (t.daysLeft == null || t.daysLeft > 30)) return false;
    if (expInner === "expired" && t.expiryStatus !== "expired") return false;
    if (expQ && !`${fullName(c)} ${c.email || ""} ${c.phone || ""} ${c.customerNumber || ""}`.toLowerCase().includes(expQ.trim().toLowerCase())) return false;
    if (expLevel && String(c.membershipLevel || "").toUpperCase() !== expLevel) return false;
    if (expStatusF && t.expiryStatus !== expStatusF) return false;
    if (expSource && t.source !== expSource) return false;
    if (expFrom && t.expiresAt && new Date(t.expiresAt) < new Date(expFrom)) return false;
    if (expTo) {
      const end = new Date(expTo);
      end.setHours(23, 59, 59, 999);
      if (t.expiresAt && new Date(t.expiresAt) > end) return false;
    }
    return true;
  });
  const expTotal = filteredExpiry.length;
  const expPages = Math.max(1, Math.ceil(expTotal / expLimit));
  const pagedExpiry = filteredExpiry.slice((expPage - 1) * expLimit, expPage * expLimit);
  const expFromN = expTotal === 0 ? 0 : (expPage - 1) * expLimit + 1;
  const expToN = Math.min(expPage * expLimit, expTotal);
  const expireHistory = expiry.history || [];
  const expPageButtons = [];
  {
    const maxBtns = Math.min(expPages, 5);
    let start = Math.max(1, Math.min(expPage - 2, expPages - maxBtns + 1));
    for (let i = 0; i < maxBtns; i += 1) expPageButtons.push(start + i);
  }
  const filteredRewards = redeemRules.filter((r) => {
    if (rewardQ && !`${r.name} ${r.description || ""} ${r.key || ""}`.toLowerCase().includes(rewardQ.trim().toLowerCase())) return false;
    if (rewardCat && r.category !== rewardCat) return false;
    if (rewardStatusF === "active" && r.isActive === false) return false;
    if (rewardStatusF === "inactive" && r.isActive !== false) return false;
    return true;
  });
  const sortedRewards = [...filteredRewards].sort((a, b) => {
    if (rewardSort === "points") return (b.points || 0) - (a.points || 0);
    if (rewardSort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
    if (rewardSort === "priority") return (a.priority || 99) - (b.priority || 99);
    return (b.redeemedCount || 0) - (a.redeemedCount || 0);
  });
  const rewardTotal = sortedRewards.length;
  const rewardPages = Math.max(1, Math.ceil(rewardTotal / rewardLimit));
  const pagedRewards = sortedRewards.slice((rewardPage - 1) * rewardLimit, rewardPage * rewardLimit);
  const rewardFromN = rewardTotal === 0 ? 0 : (rewardPage - 1) * rewardLimit + 1;
  const rewardToN = Math.min(rewardPage * rewardLimit, rewardTotal);
  const activeRewards = redeemRules.filter((r) => r.isActive !== false).length;
  const inactiveRewards = redeemRules.length - activeRewards;
  const popularReward = [...redeemRules].sort((a, b) => (b.redeemedCount || 0) - (a.redeemedCount || 0))[0];
  const topRedeemed = [...redeemRules].sort((a, b) => (b.redeemedCount || 0) - (a.redeemedCount || 0)).slice(0, 3);
  const rulePageButtons = [];
  {
    const maxBtns = Math.min(rulePages, 5);
    let start = Math.max(1, Math.min(page - 2, rulePages - maxBtns + 1));
    for (let i = 0; i < maxBtns; i += 1) rulePageButtons.push(start + i);
  }
  const rewardPageButtons = [];
  {
    const maxBtns = Math.min(rewardPages, 5);
    let start = Math.max(1, Math.min(rewardPage - 2, rewardPages - maxBtns + 1));
    for (let i = 0; i < maxBtns; i += 1) rewardPageButtons.push(start + i);
  }

  return tab === "overview" ? (
    <PointsOverview />
  ) : tab === "members" ? (
    <PointsMembers />
  ) : tab === "transactions" ? (
    <PointsTransactions />
  ) : tab === "redeem" ? (
    <PointsRewards />
  ) : tab === "tiers" ? (
    <PointsTiers />
  ) : tab === "settings" ? (
    <PointsSettings />
  ) : (
    <div className="pts">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/points">Points & Rewards</Link>
        <span>›</span>
        <strong>{crumb}</strong>
      </nav>

      <div className="prod-head">
        {tab === "rules" ? (
          <>
            <div>
              <h1>
                <span className="prod-title-icon solid"><Icon name="star" size={16} /></span>
                Earn Rules
              </h1>
              <p>Create and manage rules that award points to customers automatically.</p>
            </div>
            <div className="prod-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={exportRules}>
                <Icon name="download" size={14} /> Export Rules
              </button>
              <button className="btn btn-purple btn-small" type="button" onClick={openNewRule}>
                <Icon name="plus" size={14} /> Add New Rule
              </button>
            </div>
          </>
        ) : tab === "redeem" ? (
          <>
            <div>
              <h1>
                <span className="prod-title-icon"><Icon name="gift" size={18} /></span>
                Redeem Rewards
              </h1>
              <p>Manage rewards that customers can redeem using their Tajira Points.</p>
            </div>
            <div className="prod-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={exportRewards}>
                <Icon name="download" size={14} /> Export Rewards
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => rewardImportRef.current?.click()}>
                <Icon name="upload" size={14} /> Import Rewards
              </button>
              <button className="btn btn-purple btn-small" type="button" onClick={openNewReward}>
                <Icon name="plus" size={14} /> Add New Reward
              </button>
              <input
                ref={rewardImportRef}
                type="file"
                accept=".json,.csv,text/csv,application/json"
                hidden
                onChange={(e) => {
                  importRewards(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </>
        ) : tab === "expiry" ? (
          <>
            <div>
              <h1>
                <span className="prod-title-icon"><Icon name="clock" size={18} /></span>
                Expiry Management
              </h1>
              <p>Manage points expiry rules and view points that will expire.</p>
            </div>
            <div className="prod-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={exportExpiry}>
                <Icon name="download" size={14} /> Export Report
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => sendReminders()}>
                <Icon name="send" size={14} /> Send Expiry Reminders
              </button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setExpInner("settings")}>
                <Icon name="gear" size={14} /> Expiry Settings
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1>
                <span className="prod-title-icon solid"><Icon name="trophy" size={18} /></span>
                Points & Rewards
              </h1>
              <p>Manage Tajira Points, earn rules and customer rewards.</p>
            </div>
            <div className="prod-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={exportCsv}>
                <Icon name="download" size={14} /> Export Report
              </button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => openModal("adjust")}>
                <Icon name="plus" size={14} /> Add / Adjust Points
              </button>
              <button className="btn btn-outline-purple btn-small" type="button" onClick={() => setTab("settings")}>
                <Icon name="gear" size={14} /> Settings
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <section className={`pts-stats ${tab === "redeem" || tab === "expiry" ? "five" : ""}`}>
        {tab === "rules" ? (
          <>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Total Earn Rules</div>
                <div className="prod-stat-n purple">{fmtNum(earnRules.length)}</div>
                <div className="cat-stat-hint">All configured rules</div>
              </div>
              <div className="prod-stat-icon purple"><Icon name="star" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Active Rules</div>
                <div className="prod-stat-n green">{fmtNum(activeRules)}</div>
                <div className="cat-stat-hint">Currently active</div>
              </div>
              <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Inactive Rules</div>
                <div className="prod-stat-n orange">{fmtNum(inactiveRules)}</div>
                <div className="cat-stat-hint">Currently inactive</div>
              </div>
              <div className="prod-stat-icon orange"><Icon name="pause" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Points Awarded (This Month)</div>
                <div className="prod-stat-n blue">{fmtNum(stats.earnedThisMonth)}</div>
                <div className={`cat-stat-hint ${(stats.earnedPct || 0) >= 0 ? "up" : ""}`}>{trendText(stats.earnedPct)}</div>
              </div>
              <div className="prod-stat-icon blue"><Icon name="bars" size={16} /></div>
            </article>
          </>
        ) : tab === "redeem" ? (
          <>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Total Rewards</div>
                <div className="prod-stat-n purple">{fmtNum(redeemRules.length)}</div>
                <div className="cat-stat-hint">All rewards</div>
              </div>
              <div className="prod-stat-icon purple"><Icon name="gift" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Active Rewards</div>
                <div className="prod-stat-n green">{fmtNum(activeRewards)}</div>
                <div className="cat-stat-hint">Active and available</div>
              </div>
              <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Inactive Rewards</div>
                <div className="prod-stat-n orange">{fmtNum(inactiveRewards)}</div>
                <div className="cat-stat-hint">Currently inactive</div>
              </div>
              <div className="prod-stat-icon orange"><Icon name="pause" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Points Redeemed (This Month)</div>
                <div className="prod-stat-n blue">{fmtNum(stats.redeemedThisMonth ?? stats.redeemed)}</div>
                <div className={`cat-stat-hint ${(stats.redeemedPct || 0) >= 0 ? "up" : ""}`}>{trendText(stats.redeemedPct)}</div>
              </div>
              <div className="prod-stat-icon blue"><Icon name="bars" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat rwd-popular">
              <div>
                <div className="muted">Popular Reward</div>
                <div className="prod-stat-n gold rwd-popular-name">{popularReward?.name || "—"}</div>
                <div className="cat-stat-hint">{fmtNum(popularReward?.redeemedCount)} redeemed</div>
              </div>
              <div className="prod-stat-icon gold"><Icon name="crown" size={16} /></div>
            </article>
          </>
        ) : tab === "expiry" ? (
          <>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Total Points Expiring</div>
                <div className="prod-stat-n purple">{fmtNum(expStats.totalExpiring)}</div>
                <div className="cat-stat-hint">Value: {fmtKes((expStats.totalExpiring || 0) * expKes)}</div>
              </div>
              <div className="prod-stat-icon purple"><Icon name="clock" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Expiring in 30 Days</div>
                <div className="prod-stat-n orange">{fmtNum(expStats.in30)}</div>
                <div className="cat-stat-hint">Value: {fmtKes((expStats.in30 || 0) * expKes)}</div>
              </div>
              <div className="prod-stat-icon orange"><Icon name="calendar" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Expiring in 7 Days</div>
                <div className="prod-stat-n red">{fmtNum(expStats.in7)}</div>
                <div className="cat-stat-hint">Value: {fmtKes((expStats.in7 || 0) * expKes)}</div>
              </div>
              <div className="prod-stat-icon red"><Icon name="calendar" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Already Expired</div>
                <div className="prod-stat-n red">{fmtNum(expStats.alreadyExpired)}</div>
                <div className="cat-stat-hint">Value: {fmtKes((expStats.alreadyExpired || 0) * expKes)}</div>
              </div>
              <div className="prod-stat-icon red"><Icon name="alarm" size={16} /></div>
            </article>
            <article className="prod-stat cat-stat">
              <div>
                <div className="muted">Auto Expired (This Month)</div>
                <div className="prod-stat-n green">{fmtNum(expStats.autoThisMonth)}</div>
                <div className={`cat-stat-hint ${(expStats.autoPct || 0) >= 0 ? "up" : ""}`}>{trendText(expStats.autoPct)}</div>
              </div>
              <div className="prod-stat-icon green"><Icon name="refresh" size={16} /></div>
            </article>
          </>
        ) : (
          STATS.map((s) => (
            <article key={s.key} className="prod-stat cat-stat">
              <div>
                <div className="muted">{s.label}</div>
                <div className={`prod-stat-n ${s.tone}`}>{fmtNum(stats[s.key])}</div>
                <div className={`cat-stat-hint ${s.pct && (stats[s.pct] || 0) >= 0 ? "up" : ""}`}>
                  {s.pct ? trendText(stats[s.pct]) : s.hint}
                </div>
              </div>
              <div className={`prod-stat-icon ${s.tone}`}>
                <Icon name={s.icon} size={16} />
              </div>
            </article>
          ))
        )}
      </section>

      <div className="pf-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={`pts-layout ${showWidgets || showDrawer || showRewardPanel || showExpiryPanel ? "has-side" : ""}`}>
        <section className="card cat-table-card">
          {(tab === "overview" || tab === "transactions") && (
            <form className="attr-filters" onSubmit={apply}>
              <div className="ord-dates" title="Select Date Range">
                <Icon name="calendar" size={14} />
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
                <span className="muted">–</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
              </div>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); load({ type: e.target.value, page: 1 }); }}>
                <option value="">All Types</option>
                <option value="earn">Earn</option>
                <option value="redeem">Redeem</option>
                <option value="adjust">Adjust</option>
                <option value="expire">Expire</option>
              </select>
              <select value={customer} onChange={(e) => { setCustomer(e.target.value); setPage(1); load({ customer: e.target.value, page: 1 }); }}>
                <option value="">All Customers</option>
                {(data.customers || []).map((c) => (
                  <option key={c.id} value={c.id}>{fullName(c)}</option>
                ))}
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); load({ status: e.target.value, page: 1 }); }}>
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by customer, order ID, reason..."
                />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={reset}>Reset</button>
            </form>
          )}

          {tab === "adjust" && (
            <form className="pts-inline-form" onSubmit={submitAdjust}>
              <select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Select customer</option>
                {(data.customers || []).map((c) => (
                  <option key={c.id} value={c.id}>{fullName(c)} · {fmtNum(c.pointsBalance)} pts</option>
                ))}
              </select>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="earn">Earn / Add</option>
                <option value="adjust">Adjust</option>
                <option value="redeem">Redeem</option>
                <option value="expire">Expire</option>
              </select>
              <input
                type="number"
                min="1"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value })}
                placeholder="Points"
              />
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason" />
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Apply"}</button>
            </form>
          )}

          {showTable && (
            <>
              <div className="prod-table-wrap">
                <table className="table prod-table pts-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Order / Ref</th>
                      <th>Points</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableTxns.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div>{fmtDate(t.createdAt)}</div>
                          <div className="muted">{fmtTime(t.createdAt)}</div>
                        </td>
                        <td>
                          <div className="cust-cell pts-cust">
                            {t.customer?.avatarUrl ? <img src={t.customer.avatarUrl} alt="" /> : <span className="cust-av">{initials(t.customer)}</span>}
                            <span>
                              <strong>{fullName(t.customer)}</strong>
                              <div className="muted">#{t.customer?.customerNumber || "CUST"}</div>
                            </span>
                          </div>
                        </td>
                        <td><span className={`st-pill ${kindCls(t.kind)}`}>{t.kindLabel}</span></td>
                        <td>{t.description || "—"}</td>
                        <td>
                          {t.reference ? (
                            /^(TAJIRA|NETZA)-/.test(String(t.reference)) ? (
                              <Link className="pts-ref" to={`/orders?q=${encodeURIComponent(t.reference)}`}>{t.reference}</Link>
                            ) : (
                              <span className="pts-ref">{t.reference}</span>
                            )
                          ) : "—"}
                        </td>
                        <td className={t.points >= 0 ? "pts-pos" : "pts-neg"}>
                          {t.points >= 0 ? "+" : ""}{fmtNum(t.points)}
                        </td>
                        <td>{fmtNum(t.balanceAfter)}</td>
                        <td>
                          <span className={`st-pill ${String(t.status).toUpperCase() === "EXPIRED" ? "pts-st-expired" : "ord-st-delivered"}`}>
                            {String(t.status).toUpperCase() === "EXPIRED" ? "Expired" : "Completed"}
                          </span>
                        </td>
                        <td>
                          <div className="prod-row-acts">
                            <button type="button" title="View" onClick={() => setDetail(t)}><Icon name="eye" size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tableTxns.length === 0 && (
                      <tr><td colSpan="9" className="muted">No point transactions match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {tab !== "adjust" && (
                <footer className="prod-pager">
                  <span>Showing {fromN} to {toN} of {fmtNum(total)} transactions</span>
                  <div className="pager-btns">
                    <button type="button" disabled={page <= 1} onClick={() => { setPage(page - 1); load({ page: page - 1 }); }}>
                      <Icon name="chevronLeft" size={14} />
                    </button>
                    {pageButtons.map((n) => (
                      <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => { setPage(n); load({ page: n }); }}>
                        {n}
                      </button>
                    ))}
                    {pages > 5 && <span className="muted">… {pages}</span>}
                    <button type="button" disabled={page >= pages} onClick={() => { setPage(page + 1); load({ page: page + 1 }); }}>
                      <Icon name="chevronRight" size={14} />
                    </button>
                  </div>
                  <select value={limit} onChange={(e) => { const n = Number(e.target.value); setLimit(n); setPage(1); load({ limit: n, page: 1 }); }}>
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                </footer>
              )}
            </>
          )}

          {tab === "rules" && (
            <>
              <form
                className="attr-filters pts-rules-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                }}
              >
                <div className="prod-search">
                  <Icon name="search" size={16} />
                  <input
                    value={ruleQ}
                    onChange={(e) => { setRuleQ(e.target.value); setPage(1); }}
                    placeholder="Search rules..."
                  />
                </div>
                <select value={ruleTypeF} onChange={(e) => { setRuleTypeF(e.target.value); setPage(1); }}>
                  <option value="">All Types</option>
                  {RULE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <select value={ruleStatusF} onChange={(e) => { setRuleStatusF(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select value={ruleTriggerF} onChange={(e) => { setRuleTriggerF(e.target.value); setPage(1); }}>
                  <option value="">All Triggers</option>
                  {TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-small" type="submit">
                  <Icon name="filter" size={14} /> Filter
                </button>
                <button
                  className="link-reset"
                  type="button"
                  onClick={() => {
                    setRuleQ("");
                    setRuleTypeF("");
                    setRuleStatusF("");
                    setRuleTriggerF("");
                    setPage(1);
                  }}
                >
                  Reset
                </button>
              </form>
              <div className="pts-rules-scroll">
                <table className="table pts-rules-table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Type</th>
                      <th>Trigger / Condition</th>
                      <th>Points</th>
                      <th>Limit</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRules.map((r) => {
                      const meta = ruleTypeMeta(r.ruleType);
                      return (
                        <tr key={r.id} className={ruleOpen === r.id ? "is-open" : ""}>
                          <td>
                            <button className="rule-name" type="button" onClick={() => openEditRule(r)}>
                              <span className={`rule-ico ${meta.tone}`}><Icon name={meta.icon} size={14} /></span>
                              <span>
                                <strong>{r.name}</strong>
                                <em>{r.key}</em>
                              </span>
                            </button>
                          </td>
                          <td><span className={`st-pill ${meta.cls}`}>{meta.label}</span></td>
                          <td><span className="pts-rules-trigger">{triggerText(r)}</span></td>
                          <td className="pts-pos">+{fmtNum(r.points)}</td>
                          <td className="pts-rules-limit">{limitText(r.limit)}</td>
                          <td>
                            <button
                              className={`pts-switch ${r.isActive !== false ? "on" : ""}`}
                              type="button"
                              aria-label={r.isActive !== false ? "Active" : "Inactive"}
                              onClick={() => toggleRule(r)}
                            >
                              <i />
                            </button>
                          </td>
                          <td className="pts-rules-pri">{r.priority || "—"}</td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="Edit" onClick={() => openEditRule(r)}><Icon name="pencil" size={14} /></button>
                              <span className="ord-menu-wrap">
                                <button
                                  type="button"
                                  title="More"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRuleMenu(ruleMenu === r.id ? null : r.id);
                                  }}
                                >
                                  <Icon name="more" size={14} />
                                </button>
                                {ruleMenu === r.id && (
                                  <div className="ord-menu" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" onClick={() => openEditRule(r)}>Edit rule</button>
                                    <button type="button" onClick={() => duplicateRule(r)}>Duplicate</button>
                                    <button type="button" onClick={() => { toggleRule(r); setRuleMenu(null); }}>
                                      {r.isActive !== false ? "Deactivate" : "Activate"}
                                    </button>
                                  </div>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pagedRules.length === 0 && (
                      <tr><td colSpan="8" className="muted">No earn rules match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="prod-pager">
                <span>Showing {ruleFrom} to {ruleTo} of {fmtNum(ruleTotal)} rules</span>
                <div className="pager-btns">
                  <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  {rulePageButtons.map((n) => (
                    <button key={n} type="button" className={n === page ? "on" : ""} onClick={() => setPage(n)}>
                      {n}
                    </button>
                  ))}
                  <button type="button" disabled={page >= rulePages} onClick={() => setPage(page + 1)}>
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
                <label className="prod-rows">
                  Rows per page
                  <select value={limit} onChange={(e) => { const n = Number(e.target.value); setLimit(n); setPage(1); }}>
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </footer>
            </>
          )}

          {tab === "redeem" && (
            <>
              <div className="cust-group-bar rwd-cat-bar">
                {REWARD_CATS.map((c) => (
                  <button
                    key={c.id || "all"}
                    type="button"
                    className={rewardCat === c.id ? "on" : ""}
                    onClick={() => { setRewardCat(c.id); setRewardPage(1); }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <form
                className="attr-filters"
                onSubmit={(e) => {
                  e.preventDefault();
                  setRewardPage(1);
                }}
              >
                <div className="prod-search">
                  <Icon name="search" size={16} />
                  <input
                    value={rewardQ}
                    onChange={(e) => { setRewardQ(e.target.value); setRewardPage(1); }}
                    placeholder="Search rewards by name..."
                  />
                </div>
                <select value={rewardCat} onChange={(e) => { setRewardCat(e.target.value); setRewardPage(1); }}>
                  {REWARD_CATS.map((c) => (
                    <option key={c.id || "all"} value={c.id}>{c.id ? c.label : "All Categories"}</option>
                  ))}
                </select>
                <select value={rewardStatusF} onChange={(e) => { setRewardStatusF(e.target.value); setRewardPage(1); }}>
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select value={rewardSort} onChange={(e) => { setRewardSort(e.target.value); setRewardPage(1); }}>
                  <option value="popular">Sort by: Popular</option>
                  <option value="points">Sort by: Points</option>
                  <option value="name">Sort by: Name</option>
                  <option value="priority">Sort by: Priority</option>
                </select>
                <button className="btn btn-ghost btn-small" type="submit">
                  <Icon name="filter" size={14} /> Filter
                </button>
                <button
                  className="link-reset"
                  type="button"
                  onClick={() => {
                    setRewardQ("");
                    setRewardCat("");
                    setRewardStatusF("");
                    setRewardSort("popular");
                    setRewardPage(1);
                  }}
                >
                  Reset
                </button>
              </form>
              <div className="prod-table-wrap">
                <table className="table prod-table pts-table rwd-table">
                  <thead>
                    <tr>
                      <th>Reward</th>
                      <th>Category</th>
                      <th>Points Cost</th>
                      <th>Stock / Limit</th>
                      <th>Redeemed</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRewards.map((r) => {
                      const meta = rewardCatMeta(r.category);
                      return (
                        <tr key={r.id} className={rewardOpen === r.id ? "is-open" : ""}>
                          <td>
                            <button className="rule-name rwd-name" type="button" onClick={() => openEditReward(r)}>
                              {r.imageUrl
                                ? <img src={r.imageUrl} alt="" className="rwd-thumb" />
                                : (
                                  <span className={`rule-ico ${meta.tone}`}>
                                    <Icon name={meta.icon} size={14} />
                                  </span>
                                )}
                              <span>
                                <strong>{r.name}</strong>
                                <div className="muted">{r.description || r.key}</div>
                              </span>
                            </button>
                          </td>
                          <td><span className={`st-pill ${meta.cls}`}>{meta.label}</span></td>
                          <td className="mono"><strong>{fmtNum(r.points)}</strong> Pts</td>
                          <td>{stockText(r)}</td>
                          <td>{fmtNum(r.redeemedCount)}</td>
                          <td>
                            <span className={`st-pill ${r.isActive !== false ? "st-pub" : "st-draft"}`}>
                              {r.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{r.priority || "—"}</td>
                          <td>
                            <div className="prod-row-acts">
                              <button type="button" title="Edit" onClick={() => openEditReward(r)}><Icon name="pencil" size={14} /></button>
                              <button type="button" title="View" onClick={() => openEditReward(r)}><Icon name="eye" size={14} /></button>
                              <span className="ord-menu-wrap">
                                <button type="button" title="More" onClick={() => setRewardMenu(rewardMenu === r.id ? null : r.id)}>
                                  <Icon name="more" size={14} />
                                </button>
                                {rewardMenu === r.id && (
                                  <div className="ord-menu">
                                    <button type="button" onClick={() => openEditReward(r)}>Edit reward</button>
                                    <button type="button" onClick={() => duplicateReward(r)}>Duplicate</button>
                                    <button type="button" onClick={() => { toggleRule(r); setRewardMenu(null); }}>
                                      {r.isActive !== false ? "Deactivate" : "Activate"}
                                    </button>
                                  </div>
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pagedRewards.length === 0 && (
                      <tr><td colSpan="8" className="muted">No rewards match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <footer className="prod-pager">
                <span>Showing {rewardFromN} to {rewardToN} of {fmtNum(rewardTotal)} rewards</span>
                <div className="pager-btns">
                  <button type="button" disabled={rewardPage <= 1} onClick={() => setRewardPage(rewardPage - 1)}>
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  {rewardPageButtons.map((n) => (
                    <button key={n} type="button" className={n === rewardPage ? "on" : ""} onClick={() => setRewardPage(n)}>
                      {n}
                    </button>
                  ))}
                  <button type="button" disabled={rewardPage >= rewardPages} onClick={() => setRewardPage(rewardPage + 1)}>
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
                <select value={rewardLimit} onChange={(e) => { const n = Number(e.target.value); setRewardLimit(n); setRewardPage(1); }}>
                  {[8, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
              </footer>
            </>
          )}

          {tab === "expiry" && (
            <>
              <div className="pf-tabs exp-subtabs">
                {EXP_INNER.map((t) => (
                  <button key={t.id} type="button" className={expInner === t.id ? "on" : ""} onClick={() => { setExpInner(t.id); setExpPage(1); }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {(expInner === "all" || expInner === "soon" || expInner === "expired") && (
                <>
                  <form
                    className="attr-filters"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setExpPage(1);
                    }}
                  >
                    <div className="prod-search">
                      <Icon name="search" size={16} />
                      <input
                        value={expQ}
                        onChange={(e) => { setExpQ(e.target.value); setExpPage(1); }}
                        placeholder="Search by customer name, email or phone..."
                      />
                    </div>
                    <select value={expLevel} onChange={(e) => { setExpLevel(e.target.value); setExpPage(1); }}>
                      <option value="">All Membership Levels</option>
                      <option value="PLATINUM">Platinum</option>
                      <option value="GOLD">Gold</option>
                      <option value="SILVER">Silver</option>
                      <option value="BRONZE">Bronze</option>
                    </select>
                    <select value={expStatusF} onChange={(e) => { setExpStatusF(e.target.value); setExpPage(1); }}>
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="soon">Expiring Soon</option>
                      <option value="expired">Expired</option>
                    </select>
                    <select value={expSource} onChange={(e) => { setExpSource(e.target.value); setExpPage(1); }}>
                      <option value="">All Sources</option>
                      <option value="purchase">Purchase Points</option>
                      <option value="welcome">Welcome Bonus</option>
                      <option value="review">Product Review</option>
                      <option value="login">Daily Login</option>
                      <option value="referral">Referral Bonus</option>
                      <option value="adjust">Adjustment</option>
                    </select>
                    <div className="ord-dates" title="Select Date Range">
                      <Icon name="calendar" size={14} />
                      <input type="date" value={expFrom} onChange={(e) => { setExpFrom(e.target.value); setExpPage(1); }} title="From date" />
                      <span className="muted">–</span>
                      <input type="date" value={expTo} onChange={(e) => { setExpTo(e.target.value); setExpPage(1); }} title="To date" />
                    </div>
                    <button className="btn btn-ghost btn-small" type="submit">
                      <Icon name="filter" size={14} /> Filter
                    </button>
                    <button
                      className="link-reset"
                      type="button"
                      onClick={() => {
                        setExpQ("");
                        setExpLevel("");
                        setExpStatusF("");
                        setExpSource("");
                        setExpFrom("");
                        setExpTo("");
                        setExpPage(1);
                      }}
                    >
                      Reset
                    </button>
                  </form>
                  <div className="prod-table-wrap">
                    <table className="table prod-table pts-table exp-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Membership</th>
                          <th>Current Points</th>
                          <th>Points Expiring</th>
                          <th>Expiry Date</th>
                          <th>Days Left</th>
                          <th>Source</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedExpiry.map((t) => {
                          const days = daysBadge(t.daysLeft, t.expiryStatus);
                          const st = expiryStatusMeta(t.expiryStatus);
                          return (
                            <tr key={t.id}>
                              <td>
                                <button className="pts-cust" type="button" onClick={() => setDetail({ ...t, kind: "earn", kindLabel: t.sourceLabel })}>
                                  {t.customer?.avatarUrl ? <img src={t.customer.avatarUrl} alt="" /> : <span className="cust-av">{initials(t.customer)}</span>}
                                  <span>
                                    <strong>{fullName(t.customer)}</strong>
                                    <div className="muted">{t.customer?.email || t.customer?.phone || `#${t.customer?.customerNumber || ""}`}</div>
                                    <div className="muted">{t.customer?.phone}</div>
                                  </span>
                                </button>
                              </td>
                              <td><span className={`st-pill ${groupCls(t.customer?.membershipLevel)}`}>{groupLabel(t.customer?.membershipLevel)}</span></td>
                              <td>{fmtNum(t.customer?.pointsBalance)}</td>
                              <td className="pts-neg">{fmtNum(t.points)}</td>
                              <td>
                                <div>{fmtDate(t.expiresAt)}</div>
                                <div className="muted">{fmtTime(t.expiresAt)}</div>
                              </td>
                              <td><span className={`st-pill ${days.cls}`}>{days.text}</span></td>
                              <td>
                                <strong>{t.sourceLabel}</strong>
                                <div className="muted">{t.reference || t.description}</div>
                              </td>
                              <td><span className={`st-pill ${st.cls}`}>{st.label}</span></td>
                              <td>
                                <div className="prod-row-acts">
                                  <button type="button" title="View" onClick={() => setDetail({ ...t, kind: "earn", kindLabel: t.sourceLabel })}>
                                    <Icon name="eye" size={14} />
                                  </button>
                                  <span className="ord-menu-wrap">
                                    <button type="button" title="More" onClick={() => setExpMenu(expMenu === t.id ? null : t.id)}>
                                      <Icon name="more" size={14} />
                                    </button>
                                    {expMenu === t.id && (
                                      <div className="ord-menu">
                                        <button type="button" onClick={() => { setDetail({ ...t, kind: "earn", kindLabel: t.sourceLabel }); setExpMenu(null); }}>View batch</button>
                                        {t.customer?.id && (
                                          <Link to={`/customers/${t.customer.id}`} onClick={() => setExpMenu(null)}>View customer</Link>
                                        )}
                                        {t.expiryStatus !== "expired" && (
                                          <>
                                            <button type="button" onClick={() => sendReminders(t.id)}>Send reminder</button>
                                            <button type="button" onClick={() => { expireOne(t.id); setExpMenu(null); }}>Expire now</button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {pagedExpiry.length === 0 && (
                          <tr><td colSpan="9" className="muted">No expiry batches match these filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <footer className="prod-pager">
                    <span>Showing {expFromN} to {expToN} of {fmtNum(expTotal)} customers</span>
                    <div className="pager-btns">
                      <button type="button" disabled={expPage <= 1} onClick={() => setExpPage(expPage - 1)}>
                        <Icon name="chevronLeft" size={14} />
                      </button>
                      {expPageButtons.map((n) => (
                        <button key={n} type="button" className={n === expPage ? "on" : ""} onClick={() => setExpPage(n)}>
                          {n}
                        </button>
                      ))}
                      <button type="button" disabled={expPage >= expPages} onClick={() => setExpPage(expPage + 1)}>
                        <Icon name="chevronRight" size={14} />
                      </button>
                    </div>
                    <select value={expLimit} onChange={(e) => { const n = Number(e.target.value); setExpLimit(n); setExpPage(1); }}>
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>{n} / page</option>
                      ))}
                    </select>
                  </footer>
                </>
              )}

              {expInner === "rules" && (
                <div className="prod-table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Rule</th><th>Trigger</th><th>Duration</th><th>Reminder</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {(expiry.rules || []).map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td>{r.trigger}</td>
                          <td>{r.duration}</td>
                          <td>{r.reminder}</td>
                          <td>
                            <span className={`st-pill ${r.isActive ? "st-pub" : "st-draft"}`}>{r.isActive ? "Enabled" : "Disabled"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {expInner === "history" && (
                <div className="prod-table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Customer</th><th>Points</th><th>Date expired</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      {expireHistory.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{fullName(t.customer)}</strong>
                            <div className="muted">#{t.customer?.customerNumber}</div>
                          </td>
                          <td className="pts-neg">{fmtNum(Math.abs(t.points || 0))}</td>
                          <td>
                            <div>{fmtDate(t.createdAt)}</div>
                            <div className="muted">{fmtTime(t.createdAt)}</div>
                          </td>
                          <td>{t.description || t.sourceLabel}</td>
                        </tr>
                      ))}
                      {expireHistory.length === 0 && (
                        <tr><td colSpan="4" className="muted">No expiry history yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {expInner === "reminders" && (
                <div className="prod-table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>Date</th><th>Customer</th><th>Channel</th><th>Points</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {(expiry.reminders || []).map((r, i) => (
                        <tr key={`${r.at}-${i}`}>
                          <td>
                            <div>{fmtDate(r.at)}</div>
                            <div className="muted">{fmtTime(r.at)}</div>
                          </td>
                          <td>{r.customer}</td>
                          <td>{r.channel}</td>
                          <td>{fmtNum(r.points)}</td>
                          <td><span className="st-pill st-pub">{r.status || "Sent"}</span></td>
                        </tr>
                      ))}
                      {(expiry.reminders || []).length === 0 && (
                        <tr><td colSpan="5" className="muted">No reminders sent yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {expInner === "settings" && (
                <form className="pts-settings exp-settings" onSubmit={saveSettings}>
                  <label>
                    Expiry type
                    <select value={settings.expiryType || "automatic"} onChange={(e) => setSettings({ ...settings, expiryType: e.target.value })}>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label>
                    Default expiry duration (days)
                    <input type="number" min="1" value={settings.expiryDays} onChange={(e) => setSettings({ ...settings, expiryDays: e.target.value })} />
                  </label>
                  <label>
                    Minimum balance to expire
                    <input type="number" min="0" value={settings.minBalance ?? 100} onChange={(e) => setSettings({ ...settings, minBalance: e.target.value })} />
                  </label>
                  <div className="rule-status-row">
                    <span>Auto expiry</span>
                    <button className={`pts-switch ${settings.autoExpiry !== false ? "on" : ""}`} type="button" onClick={() => setSettings({ ...settings, autoExpiry: settings.autoExpiry === false })}>
                      <i />
                    </button>
                    <strong>{settings.autoExpiry !== false ? "Enabled" : "Disabled"}</strong>
                  </div>
                  <div className="rule-status-row">
                    <span>Reminders</span>
                    <button className={`pts-switch ${settings.remindersEnabled !== false ? "on" : ""}`} type="button" onClick={() => setSettings({ ...settings, remindersEnabled: settings.remindersEnabled === false })}>
                      <i />
                    </button>
                    <strong>{settings.remindersEnabled !== false ? "Enabled" : "Disabled"}</strong>
                  </div>
                  <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save settings"}</button>
                </form>
              )}
            </>
          )}

          {tab === "settings" && (
            <form className="pts-settings" onSubmit={saveSettings}>
              <label>
                Points expiry (days)
                <input type="number" min="1" value={settings.expiryDays} onChange={(e) => setSettings({ ...settings, expiryDays: e.target.value })} />
              </label>
              <label>
                KES per purchase point
                <input type="number" min="1" value={settings.kesPerPoint} onChange={(e) => setSettings({ ...settings, kesPerPoint: e.target.value })} />
              </label>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save settings"}</button>
            </form>
          )}
        </section>

        {showWidgets && (
          <aside className="pts-side">
            <section className="card pts-widget">
              <h3>Quick Actions</h3>
              <button type="button" className="pts-qa" onClick={() => openModal("earn")}>
                <span className="pts-qa-ico purple"><Icon name="plus" size={14} /></span>
                Add Points to Customer
              </button>
              <button type="button" className="pts-qa" onClick={() => openModal("redeem")}>
                <span className="pts-qa-ico orange"><Icon name="star" size={14} /></span>
                Redeem Points
              </button>
              <button type="button" className="pts-qa" onClick={() => openModal("adjust")}>
                <span className="pts-qa-ico blue"><Icon name="pencil" size={14} /></span>
                Point Adjustment
              </button>
              <button type="button" className="pts-qa" onClick={() => importRef.current?.click()}>
                <span className="pts-qa-ico green"><Icon name="upload" size={14} /></span>
                Bulk Point Upload
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json,.csv,text/csv,application/json"
                hidden
                onChange={(e) => {
                  importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </section>

            <section className="card pts-widget">
              <h3>Points Summary</h3>
              <ul className="pts-sum">
                <li><span>Total Members</span><b>{fmtNum(summary.totalMembers)}</b></li>
                <li><span>Active Members Earning</span><b>{fmtNum(summary.activeEarning)}</b></li>
                <li><span>Members with Points</span><b>{fmtNum(summary.membersWithPoints)}</b></li>
                <li><span>Outstanding Points</span><b>{fmtNum(summary.outstanding)}</b></li>
                <li className="danger-txt"><span>Points Expiring (30 Days)</span><b>{fmtNum(summary.expiring30)}</b></li>
              </ul>
            </section>

            <section className="card pts-widget">
              <h3>Top Points Holders</h3>
              <ol className="pts-leaders">
                {(data.leaders || []).slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <span className={`pts-rank r${c.rank}`}>{c.rank}</span>
                    {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="cust-av">{initials(c)}</span>}
                    <span>
                      <strong>{fullName(c)}</strong>
                      <div className="muted">{fmtNum(c.pointsBalance)} Pts</div>
                    </span>
                  </li>
                ))}
              </ol>
              <button className="link-reset" type="button" onClick={() => setShowLeaders(true)}>View Full Leaderboard</button>
            </section>

            <section className="pts-alert">
              <Icon name="clock" size={18} />
              <div>
                <b>{fmtNum(summary.expiring30)}</b> points will expire in the next 30 days.
                <button className="link-reset" type="button" onClick={() => setTab("expiry")}>Manage Expiry</button>
              </div>
            </section>
          </aside>
        )}

        {showDrawer && (
          <aside className="ord-drawer rule-drawer">
            <div className="ord-drawer-head">
              <h2>Add / Edit Earn Rule</h2>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setRuleOpen(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={submitRule}>
              <label>
                Rule Name
                <input required value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="Purchase Points" />
              </label>
              <label>
                Rule Type
                <select value={ruleForm.ruleType} onChange={(e) => setRuleForm({ ...ruleForm, ruleType: e.target.value })}>
                  {RULE_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Trigger / Condition
                <select value={ruleForm.trigger} onChange={(e) => setRuleForm({ ...ruleForm, trigger: e.target.value })}>
                  {TRIGGERS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              {(ruleForm.trigger === "amount_spent" || ruleForm.trigger === "login_streak") && (
                <label>
                  Condition Value
                  <span className={`pts-prefix ${ruleForm.trigger === "amount_spent" ? "kes" : ""}`}>
                    {ruleForm.trigger === "amount_spent" && <em>KSh</em>}
                    <input
                      value={ruleForm.conditionValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, conditionValue: e.target.value })}
                      placeholder={ruleForm.trigger === "amount_spent" ? "100" : "7"}
                    />
                  </span>
                </label>
              )}
              <label>
                Points to Award
                <input type="number" min="0" required value={ruleForm.points} onChange={(e) => setRuleForm({ ...ruleForm, points: e.target.value })} />
              </label>
              <label>
                Limit
                <select value={ruleForm.limit} onChange={(e) => setRuleForm({ ...ruleForm, limit: e.target.value })}>
                  {LIMITS.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <input type="number" min="1" max="99" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value })} />
                <span className="muted" style={{ fontSize: 12 }}>Lower number = higher priority</span>
              </label>
              <div className="rule-status-row">
                <span>Status</span>
                <button
                  className={`pts-switch ${ruleForm.isActive ? "on" : ""}`}
                  type="button"
                  onClick={() => setRuleForm({ ...ruleForm, isActive: !ruleForm.isActive })}
                >
                  <i />
                </button>
                <strong>{ruleForm.isActive ? "Active" : "Inactive"}</strong>
              </div>
              <label>
                Description
                <textarea rows={3} value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="How this rule awards points" />
              </label>
              <div className="prod-actions rule-drawer-acts">
                <button className="btn btn-ghost btn-small" type="button" onClick={() => setRuleOpen(null)}>Cancel</button>
                <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                  <Icon name="check" size={14} /> {busy ? "Saving…" : "Save Rule"}
                </button>
              </div>
            </form>
          </aside>
        )}

        {showRewardPanel && (
          <aside className="pts-side rwd-side">
            <section className="ord-drawer rule-drawer rwd-drawer">
              <div className="ord-drawer-head">
                <h2>Add / Edit Reward</h2>
                <button className="icon-btn" type="button" aria-label="Close" onClick={openNewReward}>
                  <Icon name="x" size={16} />
                </button>
              </div>
              <form onSubmit={submitReward}>
                <label>
                  Reward Type
                  <select value={rewardForm.category} onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}>
                    {REWARD_CATS.filter((c) => c.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reward Name
                  <input required value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="KSh 500 Voucher" />
                </label>
                <label>
                  Description
                  <textarea rows={3} value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} placeholder="What the customer receives" />
                </label>
                <label>
                  Category
                  <select value={rewardForm.group} onChange={(e) => setRewardForm({ ...rewardForm, group: e.target.value })}>
                    {REWARD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Points Cost
                  <input type="number" min="1" required value={rewardForm.points} onChange={(e) => setRewardForm({ ...rewardForm, points: e.target.value })} />
                </label>
                <label>
                  Stock / Limit
                  <input
                    type="number"
                    min="0"
                    disabled={rewardForm.unlimited}
                    value={rewardForm.unlimited ? "" : rewardForm.stock}
                    onChange={(e) => setRewardForm({ ...rewardForm, stock: e.target.value })}
                    placeholder="50"
                  />
                </label>
                <label className="rwd-check">
                  <input
                    type="checkbox"
                    checked={rewardForm.unlimited}
                    onChange={(e) => setRewardForm({ ...rewardForm, unlimited: e.target.checked, stock: e.target.checked ? "" : rewardForm.stock })}
                  />
                  Unlimited
                </label>
                <div className="rwd-dates">
                  <label>
                    Start Date
                    <input type="date" value={rewardForm.startsAt} onChange={(e) => setRewardForm({ ...rewardForm, startsAt: e.target.value })} />
                  </label>
                  <label>
                    End Date
                    <input type="date" value={rewardForm.endsAt} onChange={(e) => setRewardForm({ ...rewardForm, endsAt: e.target.value })} />
                  </label>
                </div>
                <div className="rule-status-row">
                  <span>Status</span>
                  <button
                    className={`pts-switch ${rewardForm.isActive ? "on" : ""}`}
                    type="button"
                    onClick={() => setRewardForm({ ...rewardForm, isActive: !rewardForm.isActive })}
                  >
                    <i />
                  </button>
                  <strong>{rewardForm.isActive ? "Active" : "Inactive"}</strong>
                </div>
                <label>
                  Priority
                  <input type="number" min="1" max="99" value={rewardForm.priority} onChange={(e) => setRewardForm({ ...rewardForm, priority: e.target.value })} />
                </label>
                <div className="prod-actions rule-drawer-acts">
                  <button className="btn btn-ghost btn-small" type="button" onClick={openNewReward}>Cancel</button>
                  <button className="btn btn-purple btn-small" disabled={busy} type="submit">
                    <Icon name="check" size={14} /> {busy ? "Saving…" : "Save Reward"}
                  </button>
                </div>
              </form>
            </section>

            <section className="card pts-widget">
              <h3>Top Redeemed Rewards</h3>
              <ol className="pts-leaders rwd-top">
                {topRedeemed.map((r, i) => (
                  <li key={r.id}>
                    <span className={`pts-rank r${i + 1}`}>{i + 1}</span>
                    {r.imageUrl ? <img src={r.imageUrl} alt="" /> : <span className={`rule-ico ${rewardCatMeta(r.category).tone}`}><Icon name={rewardCatMeta(r.category).icon} size={12} /></span>}
                    <span>
                      <strong>{r.name}</strong>
                      <div className="muted">{fmtNum(r.redeemedCount)} redeemed</div>
                    </span>
                  </li>
                ))}
                {topRedeemed.length === 0 && <li className="muted">No redemptions yet.</li>}
              </ol>
            </section>
          </aside>
        )}

        {showExpiryPanel && (
          <aside className="pts-side rwd-side">
            <section className="card pts-widget">
              <h3>Expiry Settings Summary</h3>
              <ul className="pts-sum">
                <li><span>Expiry Type</span><b>{settings.expiryType === "manual" ? "Manual" : "Automatic"}</b></li>
                <li><span>Default Expiry Duration</span><b>{Math.round((Number(settings.expiryDays) || 365) / 30)} Months</b></li>
                <li><span>Minimum Balance to Expire</span><b>{fmtNum(settings.minBalance ?? 100)} Points</b></li>
                <li>
                  <span>Auto Expiry</span>
                  <b className={settings.autoExpiry !== false ? "pts-pos" : "pts-neg"}>{settings.autoExpiry !== false ? "Enabled" : "Disabled"}</b>
                </li>
                <li>
                  <span>Reminders</span>
                  <b className={settings.remindersEnabled !== false ? "pts-pos" : "pts-neg"}>{settings.remindersEnabled !== false ? "Enabled" : "Disabled"}</b>
                </li>
              </ul>
            </section>

            <section className="card pts-widget">
              <h3>Upcoming Expiry Summary</h3>
              <ul className="pts-sum">
                <li><span>7 days</span><b>{fmtNum(expiry.buckets?.d7)}</b></li>
                <li><span>30 days</span><b>{fmtNum(expiry.buckets?.d30)}</b></li>
                <li><span>60 days</span><b>{fmtNum(expiry.buckets?.d60)}</b></li>
                <li><span>90+ days</span><b>{fmtNum(expiry.buckets?.d90plus)}</b></li>
                <li><span>Total</span><b>{fmtNum(expiry.buckets?.total)}</b></li>
              </ul>
            </section>

            <section className="card pts-widget">
              <h3>Expiry Trend (Last 6 Months)</h3>
              <div className="exp-trend">
                {(expiry.trend || []).map((m) => (
                  <div key={m.label} className="exp-trend-col">
                    <div className="exp-trend-bar" style={{ height: `${Math.max(8, m.pct || 0)}%` }} />
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="pts-alert exp-auto-card">
              <Icon name="refresh" size={18} />
              <div>
                <strong>Auto Expiry (This Month)</strong>
                <div>Customers Affected: <b>{fmtNum(expStats.customersAffected)}</b></div>
                <div className="pts-neg">Points Expired: {fmtNum(expStats.autoThisMonth)}</div>
              </div>
            </section>
          </aside>
        )}
      </div>

      {tab === "rules" && (
        <section className="rule-how pts-rules-how">
          <h3>How Earn Rules Work</h3>
          <div className="rule-how-grid">
            <article>
              <span className="rule-how-ico purple"><Icon name="gear" size={16} /></span>
              <div>
                <strong>Automatic</strong>
                <p>Points are awarded instantly when a trigger is met.</p>
              </div>
            </article>
            <article>
              <span className="rule-how-ico blue"><Icon name="star" size={16} /></span>
              <div>
                <strong>Flexible</strong>
                <p>Set daily, weekly, yearly, or one-time limits.</p>
              </div>
            </article>
            <article>
              <span className="rule-how-ico green"><Icon name="shield" size={16} /></span>
              <div>
                <strong>Priority Based</strong>
                <p>Rules run in order, lowest priority number first.</p>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === "redeem" && (
        <section className="rule-how rwd-how">
          <div className="rule-how-grid">
            <article>
              <span className="rule-how-ico purple"><Icon name="gift" size={16} /></span>
              <div>
                <strong>How Redeem Rewards Work</strong>
                <p>Customers spend Tajira Points on a reward. Stock is deducted and delivery is issued automatically.</p>
              </div>
            </article>
            <article>
              <span className="rule-how-ico blue"><Icon name="truck" size={16} /></span>
              <div>
                <strong>Reward Delivery Methods</strong>
                <label className="rwd-check"><input type="checkbox" checked readOnly disabled /> Vouchers: Auto-issued</label>
                <label className="rwd-check"><input type="checkbox" checked readOnly disabled /> Products: Normal order</label>
                <label className="rwd-check"><input type="checkbox" checked readOnly disabled /> Coupons: Applied at checkout</label>
              </div>
            </article>
            <article>
              <span className="rule-how-ico green"><Icon name="shield" size={16} /></span>
              <div>
                <strong>Important Notes</strong>
                <p>Keep stock accurate and set expiry dates so customers cannot redeem unavailable or expired rewards.</p>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === "expiry" && (
        <section className="exp-footer">
          <article className="rule-how rwd-how">
            <div className="rule-how-grid" style={{ gridTemplateColumns: "1fr" }}>
              <article>
                <span className="rule-how-ico purple"><Icon name="clock" size={16} /></span>
                <div>
                  <strong>About Points Expiry</strong>
                  <p>Points expire after the configured duration and cannot be restored unless adjusted manually by an admin.</p>
                </div>
              </article>
            </div>
          </article>
          <article className="card exp-actions">
            <h3>Expiry Actions</h3>
            <div className="prod-actions">
              <button className="btn btn-ghost btn-small" type="button" onClick={() => sendReminders()}>
                <Icon name="send" size={14} /> Send Expiry Reminders
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={runExpiry}>
                <Icon name="alarm" size={14} /> Expire Now
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => openModal("expire")}>
                <Icon name="pencil" size={14} /> Adjust Expired Points
              </button>
              <button className="btn btn-ghost btn-small" type="button" onClick={exportExpiry}>
                <Icon name="download" size={14} /> Export Expiry List
              </button>
            </div>
          </article>
        </section>
      )}

      {modal && (
        <div className="prod-modal" onClick={() => setModal(null)}>
          <form className="card prod-modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submitAdjust}>
            <h2>
              {modal === "earn" ? "Add Points to Customer" : modal === "redeem" ? "Redeem Points" : modal === "expire" ? "Expire Points" : "Add / Adjust Points"}
            </h2>
            <label>
              Customer
              <select required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Select customer</option>
                {(data.customers || []).map((c) => (
                  <option key={c.id} value={c.id}>{fullName(c)} · #{c.customerNumber} · {fmtNum(c.pointsBalance)} pts</option>
                ))}
              </select>
            </label>
            <div className="pf-2">
              <label>
                Type
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="earn">Earn / Add</option>
                  <option value="adjust">Adjust</option>
                  <option value="redeem">Redeem</option>
                  <option value="expire">Expire</option>
                </select>
              </label>
              <label>
                Points
                <input type="number" min="1" required value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
              </label>
            </div>
            <label>
              Order / Ref
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Optional" />
            </label>
            <label>
              Reason
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Why are these points changing?" />
            </label>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-purple btn-small" disabled={busy} type="submit">{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="prod-modal" onClick={() => setDetail(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Point transaction</h2>
            <ul className="cprof-dl">
              <li><span className="muted">Date</span> {fmtDate(detail.createdAt)} {fmtTime(detail.createdAt)}</li>
              <li><span className="muted">Customer</span> {fullName(detail.customer)} #{detail.customer?.customerNumber}</li>
              <li><span className="muted">Type</span> <span className={`st-pill ${kindCls(detail.kind)}`}>{detail.kindLabel}</span></li>
              <li><span className="muted">Description</span> {detail.description || "—"}</li>
              <li><span className="muted">Reference</span> {detail.reference || "—"}</li>
              <li><span className="muted">Points</span> <b className={detail.points >= 0 ? "pts-pos" : "pts-neg"}>{detail.points >= 0 ? "+" : ""}{fmtNum(detail.points)}</b></li>
              <li><span className="muted">Balance after</span> {fmtNum(detail.balanceAfter)}</li>
              <li><span className="muted">Status</span> {String(detail.status).toUpperCase() === "EXPIRED" ? "Expired" : "Completed"}</li>
            </ul>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
      )}

      {showLeaders && (
        <div className="prod-modal" onClick={() => setShowLeaders(false)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Points leaderboard</h2>
            <ol className="pts-leaders">
              {(data.leaders || []).map((c) => (
                <li key={c.id}>
                  <span className={`pts-rank r${c.rank}`}>{c.rank}</span>
                  {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : <span className="cust-av">{initials(c)}</span>}
                  <span>
                    <strong>{fullName(c)}</strong>
                    <div className="muted">#{c.customerNumber}</div>
                  </span>
                  <b>{fmtNum(c.pointsBalance)} Pts</b>
                </li>
              ))}
            </ol>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowLeaders(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
