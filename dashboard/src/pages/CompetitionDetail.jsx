import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, kes } from "../api";
import { Icon } from "../icons";
import CompetitionPrizes from "./CompetitionPrizes";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "participants", label: "Participants" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "entries", label: "Entries / Attempts" },
  { id: "winners", label: "Winners" },
  { id: "prizes", label: "Prizes" },
  { id: "analytics", label: "Analytics" },
  { id: "activity", label: "Activity Log" },
];

const TYPES = {
  quiz: "Quiz",
  referral: "Referral",
  engagement: "Engagement",
  purchase: "Purchase",
  lucky_draw: "Lucky Draw",
};

const WHO = {
  all: "All Customers",
  groups: "Specific Customer Groups",
  membership: "By Membership Level",
  purchase: "By Purchase History",
};

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtWhen(value, withTime) {
  if (!value) return "—";
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  return `${date} ${time}`;
}

function statusMeta(c) {
  if (c.status === "cancelled") return { label: "Cancelled", cls: "ord-st-cancelled" };
  if (c.status === "completed") return { label: "Completed", cls: "comp-st-done" };
  if (!c.isActive) return { label: "Paused", cls: "st-draft" };
  if (c.status === "upcoming") return { label: "Upcoming", cls: "st-draft" };
  return { label: "Active", cls: "comp-st-active" };
}

function LineChart({ points }) {
  const w = 420;
  const h = 180;
  const padX = 22;
  const padY = 24;
  const values = points.map((p) => p.participants || 0);
  const max = Math.max(...values, 1);
  const coords = points.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(points.length - 1, 1);
    const y = h - padY - ((p.participants || 0) / max) * (h - padY * 2);
    return { x, y, ...p };
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = first && last ? `${line} L${last.x},${h - padY} L${first.x},${h - padY} Z` : "";
  return (
    <svg className="cd-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Participation over time">
      <path d={area} fill="rgba(109,40,217,0.16)" />
      <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.4" />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="#6D28D9" />
          <text x={c.x} y={h - 4} textAnchor="middle" className="comp-chart-lbl">{c.label.replace(" May", "")}</text>
        </g>
      ))}
    </svg>
  );
}

function RankBadge({ place }) {
  const cls = place === 1 ? "gold" : place === 2 ? "silver" : place === 3 ? "bronze" : "plain";
  return <span className={`cd-rank ${cls}`}>{place}</span>;
}

function eatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(value));
}

function fmtPhone(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return phone || "—";
}

function fmtLast(value) {
  if (!value) return "—";
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
  return `${date} ${time}`;
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

function partStatusMeta(status) {
  if (status === "completed") return { label: "Completed", cls: "ord-st-processing" };
  if (status === "disqualified") return { label: "Disqualified", cls: "ord-st-cancelled" };
  return { label: "Active", cls: "st-pub" };
}

function attemptStatusMeta(status) {
  if (status === "best") return { label: "Best Score", cls: "st-pub" };
  if (status === "progress") return { label: "In Progress", cls: "st-draft" };
  if (status === "abandoned") return { label: "Abandoned", cls: "ord-st-cancelled" };
  return { label: "Superseded", cls: "comp-st-done" };
}

function winStatusMeta(status) {
  if (status === "pending") return { label: "Pending", cls: "st-draft" };
  if (status === "declined") return { label: "Declined", cls: "ord-st-cancelled" };
  if (status === "disqualified") return { label: "Disqualified", cls: "ord-st-cancelled" };
  return { label: "Awarded", cls: "st-pub" };
}

function prizeIcon(kind) {
  if (kind === "product") return "bag";
  if (kind === "points") return "star";
  return "gift";
}

const QUIZ_QUESTIONS = [
  { q: 1, prompt: "What does IP stand for?", answer: "Internet Protocol" },
  { q: 2, prompt: "Which device forwards packets between networks?", answer: "Router" },
  { q: 3, prompt: "What does CCTV stand for?", answer: "Closed-Circuit Television" },
  { q: 4, prompt: "PoE is used to deliver…", answer: "Power over Ethernet" },
  { q: 5, prompt: "Which cable is common for office LAN runs?", answer: "Cat 6" },
  { q: 6, prompt: "A default gateway is usually a…", answer: "Router" },
  { q: 7, prompt: "What is the default subnet mask for a Class C network?", answer: "255.255.255.0" },
  { q: 8, prompt: "Which cable is used for backbone fibre links?", answer: "Single-mode fibre" },
  { q: 9, prompt: "Which IEEE standard defines Wi-Fi 6?", answer: "802.11ax" },
  { q: 10, prompt: "NVR is used to…", answer: "Record IP camera footage" },
  { q: 11, prompt: "DHCP is used to assign…", answer: "IP addresses" },
  { q: 12, prompt: "Which of the following is not a networking device?", answer: "Switch" },
  { q: 13, prompt: "A UPS is mainly used to…", answer: "Provide backup power" },
  { q: 14, prompt: "Which port is commonly used for HTTPS?", answer: "443" },
  { q: 15, prompt: "SSID refers to a…", answer: "Wi-Fi network name" },
  { q: 16, prompt: "Access control systems typically use…", answer: "RFID or PIN credentials" },
  { q: 17, prompt: "What does DNS resolve?", answer: "Domain names to IP addresses" },
  { q: 18, prompt: "A VLAN is used to…", answer: "Segment a network logically" },
  { q: 19, prompt: "Which camera type is best for night recording?", answer: "IR / night-vision camera" },
  { q: 20, prompt: "The maximum recommended length of a Cat 6 run is…", answer: "100 metres" },
];

function attemptAnswerRows(entry) {
  const wrongQ = entry?.wrong?.q;
  const unansweredFrom = (entry?.correct || 0) + (entry?.incorrect || 0);
  return QUIZ_QUESTIONS.map((q) => {
    if (entry?.status === "progress" || entry?.status === "abandoned") {
      if (q.q <= (entry.correct || 0)) return { ...q, selected: q.answer, result: "correct" };
      if (q.q <= unansweredFrom) return { ...q, selected: entry.wrong?.selected || "Hub", result: "incorrect" };
      return { ...q, selected: "", result: "unanswered" };
    }
    if (wrongQ === q.q) {
      return { ...q, selected: entry.wrong?.selected || "", result: "incorrect" };
    }
    return { ...q, selected: q.answer, result: "correct" };
  });
}

function pagerItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages]);
  if (page <= 4) {
    [2, 3, 4, 5].forEach((n) => set.add(n));
  } else if (page >= pages - 3) {
    [pages - 4, pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  } else {
    [page - 1, page, page + 1].forEach((n) => set.add(n));
  }
  return [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

function EntriesDonut({ parts, total, sub = "Total Entries" }) {
  const slices = (parts || []).reduce((s, p) => s + (p.count || 0), 0) || total;
  const r = 48;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap cd-donut">
      <svg viewBox="0 0 140 140" className="donut-svg">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F7" strokeWidth="16" />
        {(parts || []).map((p) => {
          const value = p.count || 0;
          const len = slices ? (value / slices) * c : 0;
          const el = (
            <circle
              key={p.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-total">{fmtNum(total)}</text>
        <text x="70" y="80" textAnchor="middle" className="donut-sub">{sub}</text>
      </svg>
      <ul className="donut-legend">
        {(parts || []).map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} />
            <span>{p.label}</span>
            <b>({fmtNum(p.count)}, {Number.isInteger(Number(p.pct)) ? Number(p.pct) : Number(p.pct).toFixed(1)}%)</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CompetitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "overview";
  const [c, setC] = useState(null);
  const [ov, setOv] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [chartRange, setChartRange] = useState("7d");
  const [partQ, setPartQ] = useState("");
  const [partStatus, setPartStatus] = useState("");
  const [partLevel, setPartLevel] = useState("");
  const [partType, setPartType] = useState("");
  const [partFrom, setPartFrom] = useState("2026-05-01");
  const [partTo, setPartTo] = useState("2026-05-27");
  const [partPage, setPartPage] = useState(1);
  const [partLimit, setPartLimit] = useState(20);
  const [partRows, setPartRows] = useState([]);
  const [partTotal, setPartTotal] = useState(0);
  const [partMeta, setPartMeta] = useState(null);
  const [openPart, setOpenPart] = useState(null);
  const [partMenu, setPartMenu] = useState(null);
  const [entQ, setEntQ] = useState("");
  const [entParticipant, setEntParticipant] = useState("");
  const [entSet, setEntSet] = useState("");
  const [entAttempt, setEntAttempt] = useState("");
  const [entStatus, setEntStatus] = useState("");
  const [entFrom, setEntFrom] = useState("2026-05-01");
  const [entTo, setEntTo] = useState("2026-05-27");
  const [entPage, setEntPage] = useState(1);
  const [entLimit, setEntLimit] = useState(20);
  const [entRows, setEntRows] = useState([]);
  const [entTotal, setEntTotal] = useState(0);
  const [entUnique, setEntUnique] = useState(0);
  const [entMeta, setEntMeta] = useState(null);
  const [entMenu, setEntMenu] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [winMeta, setWinMeta] = useState(null);
  const [winMenu, setWinMenu] = useState(null);
  const [openWinner, setOpenWinner] = useState(null);

  function load() {
    api(`/admin/competitions/${id}`)
      .then((d) => {
        setC(d.competition);
        setOv(d.overview || {});
      })
      .catch((err) => setError(err.message || "Could not load competition."));
  }

  useEffect(() => { load(); }, [id]);

  function participantQuery(next = {}) {
    const qs = new URLSearchParams({
      page: String(next.page ?? partPage),
      limit: String(next.limit ?? partLimit),
    });
    const q = next.q ?? partQ;
    const status = next.status ?? partStatus;
    const level = next.level ?? partLevel;
    const entryType = next.entryType ?? partType;
    const from = next.from ?? partFrom;
    const to = next.to ?? partTo;
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (level) qs.set("level", level);
    if (entryType) qs.set("entryType", entryType);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return qs.toString();
  }

  function loadParticipants(next = {}) {
    api(`/admin/competitions/${id}/participants?${participantQuery(next)}`)
      .then((d) => {
        setPartRows(d.participants || []);
        setPartTotal(d.total || 0);
        setPartMeta(d);
      })
      .catch((err) => setError(err.message || "Could not load participants."));
  }

  function entryQuery(next = {}) {
    const qs = new URLSearchParams({
      page: String(next.page ?? entPage),
      limit: String(next.limit ?? entLimit),
    });
    const q = next.q ?? entQ;
    const participant = next.participant ?? entParticipant;
    const questionSet = next.questionSet ?? entSet;
    const attempt = next.attempt ?? entAttempt;
    const status = next.status ?? entStatus;
    const from = next.from ?? entFrom;
    const to = next.to ?? entTo;
    if (q) qs.set("q", q);
    if (participant) qs.set("participant", participant);
    if (questionSet) qs.set("questionSet", questionSet);
    if (attempt) qs.set("attempt", attempt);
    if (status) qs.set("status", status);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return qs.toString();
  }

  function loadEntries(next = {}) {
    api(`/admin/competitions/${id}/entries?${entryQuery(next)}`)
      .then((d) => {
        const rows = d.entries || [];
        setEntRows(rows);
        setEntTotal(d.total || 0);
        setEntUnique(d.uniqueParticipants || 0);
        setEntMeta(d);
        setSelectedEntry((cur) => {
          if (cur && rows.some((r) => r.id === cur.id)) return rows.find((r) => r.id === cur.id) || rows[0] || null;
          return rows[0] || null;
        });
      })
      .catch((err) => setError(err.message || "Could not load entries."));
  }

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!c) return;
    const flash = c.code === "COMP-328" || String(c.title || "").toLowerCase() === "flash tech quiz";
    if (flash) {
      setPartFrom("2026-05-01");
      setPartTo("2026-05-27");
      setEntFrom("2026-05-01");
      setEntTo("2026-05-27");
      return;
    }
    if (c.startsAt) {
      const day = eatDay(c.startsAt);
      setPartFrom(day);
      setEntFrom(day);
    }
    if (c.endsAt) {
      const day = eatDay(c.endsAt);
      setPartTo(day);
      setEntTo(day);
    }
  }, [c?.id]);

  useEffect(() => {
    if (tab !== "participants" || !id) return;
    loadParticipants();
  }, [tab, id, partPage, partLimit, partQ, partStatus, partLevel, partType, partFrom, partTo]);

  useEffect(() => {
    if (tab !== "entries" || !id) return;
    loadEntries();
  }, [tab, id, entPage, entLimit, entQ, entParticipant, entSet, entAttempt, entStatus, entFrom, entTo]);

  useEffect(() => {
    if (tab !== "winners" || !id) return;
    api(`/admin/competitions/${id}/winners`)
      .then((d) => setWinMeta(d))
      .catch((err) => setError(err.message || "Could not load winners."));
  }, [tab, id]);

  const remaining = useMemo(() => {
    if (!c) return "—";
    const end = c.endsAt ? new Date(c.endsAt).getTime() : 0;
    const live = end - Date.now();
    if (live > 0) {
      const d = Math.floor(live / 86400000);
      const h = Math.floor((live % 86400000) / 3600000);
      const m = Math.floor((live % 3600000) / 60000);
      return `${d}d ${h}h ${m}m`;
    }
    if (c.isActive && ov?.remainingLabel) return ov.remainingLabel;
    return "Ended";
  }, [c, ov]);

  function setTab(next) {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  }

  async function patch(body, ok) {
    setBusy(true);
    setError("");
    try {
      const d = await api(`/admin/competitions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setC(d.competition);
      if (d.overview) setOv(d.overview);
      setToast(ok);
      setModal(null);
    } catch (err) {
      setError(err.message || "Could not update competition.");
    } finally {
      setBusy(false);
    }
  }

  async function exportParticipants() {
    try {
      const d = await api(`/admin/competitions/${id}/participants?${participantQuery({ page: 1, limit: 10000 })}`);
      const rows = d.participants || [];
      const csv = [
        "#,Customer,Email,Phone,Membership,Entries,Best Score,Correct Answers,Points Earned,Status,Last Activity",
        ...rows.map((r) => `${r.n},"${r.name}",${r.email},${r.phone},${groupLabel(r.level)},${r.entries},${r.score},${r.correct} / ${r.total},${r.points},${partStatusMeta(r.status).label},${fmtLast(r.lastAt)}`),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${c?.code || "competition"}-participants.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("Participants exported");
    } catch (err) {
      setError(err.message || "Could not export participants.");
    }
  }

  function resetPartFilters() {
    const flash = c?.code === "COMP-328" || String(c?.title || "").toLowerCase() === "flash tech quiz";
    const from = flash ? "2026-05-01" : (c?.startsAt ? eatDay(c.startsAt) : "");
    const to = flash ? "2026-05-27" : (c?.endsAt ? eatDay(c.endsAt) : "");
    setPartQ("");
    setPartStatus("");
    setPartLevel("");
    setPartType("");
    setPartFrom(from);
    setPartTo(to);
    setPartPage(1);
  }

  function resetEntryFilters() {
    const flash = c?.code === "COMP-328" || String(c?.title || "").toLowerCase() === "flash tech quiz";
    const from = flash ? "2026-05-01" : (c?.startsAt ? eatDay(c.startsAt) : "");
    const to = flash ? "2026-05-27" : (c?.endsAt ? eatDay(c.endsAt) : "");
    setEntQ("");
    setEntParticipant("");
    setEntSet("");
    setEntAttempt("");
    setEntStatus("");
    setEntFrom(from);
    setEntTo(to);
    setEntPage(1);
  }

  async function exportEntries() {
    try {
      const d = await api(`/admin/competitions/${id}/entries?${entryQuery({ page: 1, limit: 10000 })}`);
      const rows = d.entries || [];
      const csv = [
        "#,Participant,Email,Phone,Membership,Attempt,Question Set,Score,Correct,Total,Percentage,Points Earned,Status,Submitted At",
        ...rows.map((r) => `${r.n},"${r.name}",${r.email},${r.phone},${groupLabel(r.level)},${r.attempt},Set ${r.questionSet},${r.score},${r.correct},${r.total},${r.pct}%,${r.points},${attemptStatusMeta(r.status).label},${fmtLast(r.submittedAt)}`),
      ].join("\n");
      downloadCsv(`${c?.code || "competition"}-entries.csv`, csv);
      setToast("Entries exported");
    } catch (err) {
      setError(err.message || "Could not export entries.");
    }
  }

  async function downloadAnswers() {
    try {
      const d = await api(`/admin/competitions/${id}/entries?${entryQuery({ page: 1, limit: 10000 })}`);
      const rows = d.entries || [];
      const csv = [
        "Attempt,Participant,Email,Attempt #,Set,Question,Selected,Correct answer,Result",
        ...rows.flatMap((r) => {
          const wrongQ = r.wrong?.q;
          return QUIZ_QUESTIONS.map((q) => {
            const incorrect = wrongQ === q.q && r.status !== "progress";
            const selected = incorrect ? (r.wrong?.selected || "—") : (r.status === "abandoned" && q.q > (r.correct || 0) ? "" : q.answer);
            return `"${r.id}","${r.name}",${r.email},${r.attempt},${r.questionSet},${q.q} ${q.prompt},"${selected || ""}","${q.answer}",${incorrect ? "Incorrect" : selected ? "Correct" : "Unanswered"}`;
          });
        }),
      ].join("\n");
      downloadCsv(`${c?.code || "competition"}-answers.csv`, csv);
      setToast("Answers downloaded");
    } catch (err) {
      setError(err.message || "Could not download answers.");
    }
  }

  function downloadCsv(name, csv) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportWinners() {
    const rows = winMeta?.people || [];
    const csv = [
      "Rank,Winner,Email,Phone,Membership,Score,Points Won,Prize,Prize Value,Status,Awarded At",
      ...rows.map((r) => `"${r.rankLabel}","${r.name}",${r.email},${r.phone},${groupLabel(r.level)},${r.score},${r.pointsWon},"${r.prize}","${r.prizeValueLabel}",${winStatusMeta(r.status).label},${fmtLast(r.awardedAt)}`),
    ].join("\n");
    downloadCsv(`${c?.code || "competition"}-winners.csv`, csv);
    setToast("Winners exported");
  }

  function exportPrizeReport() {
    const rows = winMeta?.prizeTypes || [];
    const csv = [
      "Prize Type,Total,Disbursed,Pending,Declined,Total Value",
      ...rows.map((r) => `${r.type},${r.total},${r.disbursed},${r.pending},${r.declined},${r.value}`),
    ].join("\n");
    downloadCsv(`${c?.code || "competition"}-prize-distribution.csv`, csv);
    setToast("Prize distribution report exported");
  }

  if (error && !c) return <p className="error">{error}</p>;
  if (!c || !ov) return <p className="muted">Loading competition…</p>;

  const typeLabel = TYPES[c.type] || "Quiz";
  const who = WHO[c.whoCanParticipate] || "All Customers";
  const paused = !c.isActive && c.status === "active";
  const ended = c.status === "completed" || c.status === "cancelled";
  const chart = chartRange === "3d" ? (ov.chart || []).slice(-3) : (ov.chart || []);
  const partPages = Math.max(1, Math.ceil((partTotal || 0) / partLimit));
  const partFromN = partTotal === 0 ? 0 : (partPage - 1) * partLimit + 1;
  const partToN = Math.min(partPage * partLimit, partTotal);
  const pStats = partMeta?.stats || ov.participantStats || {};
  const breakdown = partMeta?.entryBreakdown || ov.entryBreakdown || [];
  const channels = partMeta?.channels || ov.channels || [];
  const partActivity = partMeta?.activity || ov.participantActivity || [];
  const entryTotal = partMeta?.totalEntries || ov.totalEntries || 0;
  const pageNums = pagerItems(partPage, partPages);
  const entPages = Math.max(1, Math.ceil((entTotal || 0) / entLimit));
  const entFromN = entTotal === 0 ? 0 : (entPage - 1) * entLimit + 1;
  const entToN = Math.min(entPage * entLimit, entTotal);
  const eStats = entMeta?.stats || {};
  const eBreakdown = entMeta?.statusBreakdown || [];
  const eActivity = entMeta?.activity || [];
  const entPageNums = pagerItems(entPage, entPages);
  const namedPeople = entMeta?.participants || [];
  const selectedWrong = selectedEntry?.wrong || null;
  const wStats = winMeta?.stats || {};
  const wSummary = winMeta?.summary || {};
  const wBreakdown = winMeta?.statusBreakdown || [];
  const wTiers = winMeta?.tiers || [];
  const wPeople = winMeta?.people || [];
  const wTypes = winMeta?.prizeTypes || [];
  const wActivity = winMeta?.activity || [];
  const wNotes = winMeta?.notes || [];
  const flashQuiz = c.code === "COMP-328" || String(c.title || "").toLowerCase() === "flash tech quiz";
  const st = tab === "winners" && flashQuiz ? { label: "Completed", cls: "comp-st-active" } : statusMeta(c);

  return (
    <div className="cd-page">
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/competitions">Competitions</Link>
        <span>›</span>
        {tab === "overview" ? (
          <strong>{c.title}</strong>
        ) : (
          <>
            <Link to={`/competitions/${id}`}>{c.title}</Link>
            <span>›</span>
            <strong>{tab === "winners" ? "Winners & Prizes" : (TABS.find((t) => t.id === tab)?.label || "Participants")}</strong>
          </>
        )}
      </nav>

      {tab !== "prizes" && (
      <div className="cd-hero">
        <div className="cd-hero-left">
          <div className="cd-thumb">
            <div className="ce-banner-art">
              <span className="ce-ba-orb o1" />
              <span className="ce-ba-orb o2" />
              <span className="ce-ba-laptop" />
              <strong>{(c.title || "QUIZ").toUpperCase()}</strong>
            </div>
          </div>
          <div>
            <h1>
              {c.title}
              <span className={`st-pill ${st.cls}`}>{st.label}</span>
            </h1>
            <p>
              {typeLabel} Competition • {fmtWhen(c.startsAt, true)} – {fmtWhen(c.endsAt, true)}
            </p>
          </div>
        </div>
        {(tab === "participants" || tab === "entries" || tab === "winners") ? (
          <div className="prod-actions">
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setTab("overview")}>
              <Icon name="chevronLeft" size={14} /> Back to Competition
            </button>
            {tab === "participants" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={exportParticipants}>
                <Icon name="download" size={14} /> Export Participants
              </button>
            )}
            {tab === "entries" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={exportEntries}>
                <Icon name="download" size={14} /> Export Entries
              </button>
            )}
            {tab === "winners" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={exportWinners}>
                <Icon name="download" size={14} /> Export Winners
              </button>
            )}
            {tab === "participants" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal("reminder")}>
                <Icon name="send" size={14} /> Send Reminder
              </button>
            )}
            {tab === "entries" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={downloadAnswers}>
                <Icon name="file" size={14} /> Download Answers
              </button>
            )}
            {tab === "winners" && (
              <button className="btn btn-ghost btn-small" type="button" onClick={() => setModal("results")}>
                <Icon name="eye" size={14} /> View Full Results
              </button>
            )}
            {tab === "winners" ? (
              <button className="btn btn-purple btn-small" type="button" onClick={() => setModal("winners")}>
                <Icon name="megaphone" size={14} /> Announce Winners
              </button>
            ) : (
              <button className="btn btn-purple btn-small" type="button" onClick={() => setTab("leaderboard")}>
                <Icon name="trophy" size={14} /> View Leaderboard
              </button>
            )}
          </div>
        ) : (
          <div className="prod-actions">
            <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate(`/competitions/${id}/edit`)}>
              <Icon name="pencil" size={14} /> Edit Competition
            </button>
            {!ended && (
              <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={() => setModal(paused ? "resume" : "pause")}>
                <Icon name={paused ? "play" : "pause"} size={14} /> {paused ? "Resume Competition" : "Pause Competition"}
              </button>
            )}
            {!ended && (
              <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={() => setModal("end")}>
                End Competition
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      {tab === "overview" && (
      <section className="pts-stats six">
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Participants</div>
            <div className="prod-stat-n purple">{fmtNum(c.participantCount)}</div>
            <div className="cat-stat-hint">Joined</div>
            <div className="cat-stat-hint up">↑ {Number(ov.participantsPct || 0).toFixed(1)}%</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="users" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Total Entries</div>
            <div className="prod-stat-n orange">{fmtNum(ov.totalEntries)}</div>
            <div className="cat-stat-hint">Entries</div>
            <div className="cat-stat-hint up">↑ {Number(ov.entriesPct || 0).toFixed(1)}%</div>
          </div>
          <div className="prod-stat-icon orange"><Icon name="receipt" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Completed Entries</div>
            <div className="prod-stat-n green">{fmtNum(ov.completedEntries)}</div>
            <div className="cat-stat-hint">Completed</div>
            <div className="cat-stat-hint">{Number(ov.completionRate || 0).toFixed(1)}% completion rate</div>
          </div>
          <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Points Awarded</div>
            <div className="prod-stat-n red">{fmtNum(ov.pointsAwarded)}</div>
            <div className="cat-stat-hint">Total points</div>
            <div className="cat-stat-hint up">↑ {Number(ov.pointsPct || 0).toFixed(1)}%</div>
          </div>
          <div className="prod-stat-icon red"><Icon name="star" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Prize Pool</div>
            <div className="prod-stat-n gold">{kes(ov.prizePoolKes || 0)}</div>
            <div className="cat-stat-hint">{ov.prizePoolNote}</div>
          </div>
          <div className="prod-stat-icon gold"><Icon name="gift" size={16} /></div>
        </article>
        <article className="prod-stat cat-stat">
          <div>
            <div className="muted">Time Remaining</div>
            <div className="prod-stat-n purple">{remaining}</div>
            <div className="cat-stat-hint">Ends {fmtWhen(c.endsAt, true)}</div>
          </div>
          <div className="prod-stat-icon purple"><Icon name="clock" size={16} /></div>
        </article>
      </section>
      )}

      {tab !== "prizes" && (
      <div className="pf-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      )}

      {tab === "overview" && (
        <div className="cd-grid">
          <div className="cd-col">
            <section className="card pf-card">
              <h2>Competition Description</h2>
              <p className="cd-desc">{c.description}</p>
              <dl className="cd-meta">
                <div><dt>Category</dt><dd>{c.category || "General"}</dd></div>
                <div><dt>Who Can Participate</dt><dd>{who}</dd></div>
                <div><dt>Entry Type</dt><dd>{typeLabel}</dd></div>
                <div><dt>Max Attempts</dt><dd>{ov.maxAttempts} per user</dd></div>
                <div><dt>Points for Participation</dt><dd>{ov.pointsParticipation}</dd></div>
                <div><dt>Points for Correct Answer</dt><dd>{ov.pointsCorrect}</dd></div>
              </dl>
            </section>
            <section className="card pf-card">
              <h2>Prizes & Rewards</h2>
              <ul className="cd-prizes">
                {(ov.prizes || []).map((p) => (
                  <li key={p.place}>
                    <span className={`cd-prize-ico p${Math.min(p.place, 4)}`}><Icon name="trophy" size={14} /></span>
                    <span>
                      <strong>{p.label} Prize</strong>
                      <div className="muted">{p.name}</div>
                    </span>
                  </li>
                ))}
                {(ov.prizes || []).length === 0 && <li className="muted">No prizes configured.</li>}
              </ul>
            </section>
          </div>

          <div className="cd-col">
            <section className="card pf-card">
              <div className="cprof-card-head">
                <h2>Leaderboard (Top 10)</h2>
                <button className="link-reset" type="button" onClick={() => setTab("leaderboard")}>View all</button>
              </div>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Customer</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Points</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {(ov.leaderboard || []).map((r) => (
                    <tr key={r.rank}>
                      <td><RankBadge place={r.rank} /></td>
                      <td>
                        <span className="cd-cust">
                          <img src={r.avatar} alt="" />
                          {r.name}
                        </span>
                      </td>
                      <td>{fmtNum(r.score)}</td>
                      <td>{r.correct}/{r.total}</td>
                      <td>{fmtNum(r.points)}</td>
                      <td className="muted">{r.activity}</td>
                    </tr>
                  ))}
                  {(ov.leaderboard || []).length === 0 && (
                    <tr><td colSpan="6" className="muted">No entries yet.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
            <section className="card pf-card">
              <div className="cprof-card-head">
                <h2>Participation Over Time</h2>
                <select value={chartRange} onChange={(e) => setChartRange(e.target.value)}>
                  <option value="7d">Last 7 Days</option>
                  <option value="3d">Last 3 Days</option>
                </select>
              </div>
              {chart.length ? <LineChart points={chart} /> : <p className="muted">No participation data yet.</p>}
            </section>
          </div>

          <div className="cd-col">
            <section className="card pf-card">
              <h2>Competition Status</h2>
              <span className={`st-pill ${st.cls}`}>{st.label}</span>
              <div className="cd-status-dates">
                <div><span className="muted">Start</span><b>{fmtWhen(c.startsAt, true)}</b></div>
                <div><span className="muted">End</span><b>{fmtWhen(c.endsAt, true)}</b></div>
              </div>
              <div className="cprof-bar"><i style={{ width: `${Math.min(100, ov.progressPct || 0)}%` }} /></div>
              <div className="muted">{ov.progressPct || 0}% completed</div>
            </section>
            <section className="card pf-card">
              <h2>Quick Actions</h2>
              <div className="cd-actions">
                <button type="button" onClick={() => setModal("reminder")}><Icon name="mail" size={14} /> Send Reminder to Participants</button>
                <button type="button" onClick={() => setModal("rules")}><Icon name="file" size={14} /> View Competition Rules</button>
                <button type="button" onClick={exportParticipants}><Icon name="download" size={14} /> Export Participants</button>
                <button type="button" onClick={() => setModal("winners")}><Icon name="megaphone" size={14} /> Announce Winners</button>
              </div>
            </section>
            <section className="card pf-card">
              <h2>Top Performing Questions</h2>
              <ul className="cd-qs">
                {(ov.questions || []).map((q) => (
                  <li key={q.name}>
                    <div>
                      <strong>{q.name}</strong>
                      <div className="muted">{fmtNum(q.attempts)} attempts</div>
                    </div>
                    <b>{Number(q.pct).toFixed(1)}%</b>
                  </li>
                ))}
                {(ov.questions || []).length === 0 && <li className="muted">No question stats yet.</li>}
              </ul>
            </section>
            <section className="card pf-card">
              <h2>Recent Activity</h2>
              <ul className="cprof-timeline">
                {(ov.activity || []).map((a, i) => (
                  <li key={`${a.title}-${i}`}>
                    <span className={`cprof-dot ${a.kind === "join" ? "join" : a.kind === "points" ? "points" : "done"}`}>
                      <Icon name={a.kind === "join" ? "users" : a.kind === "points" ? "star" : "trophy"} size={12} />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <div className="muted">{a.detail}</div>
                    </div>
                    <span className="muted">{a.at}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {tab === "participants" && (
        <div className="pts-layout has-side cd-part-layout">
          <section className="card pf-card">
            <form
              className="attr-filters"
              onSubmit={(e) => {
                e.preventDefault();
                setPartPage(1);
                loadParticipants({ page: 1 });
              }}
            >
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={partQ}
                  onChange={(e) => { setPartQ(e.target.value); setPartPage(1); }}
                  placeholder="Search by name, email or phone..."
                />
              </div>
              <select value={partStatus} onChange={(e) => { setPartStatus(e.target.value); setPartPage(1); }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="disqualified">Disqualified</option>
              </select>
              <select value={partLevel} onChange={(e) => { setPartLevel(e.target.value); setPartPage(1); }}>
                <option value="">All Membership Levels</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="PLATINUM">Platinum</option>
                <option value="BRONZE">Bronze</option>
              </select>
              <select value={partType} onChange={(e) => { setPartType(e.target.value); setPartPage(1); }}>
                <option value="">All Entry Types</option>
                <option value="quiz">Quiz</option>
                <option value="repeat">Repeat Entry</option>
                <option value="referral">Referral</option>
              </select>
              <div className="ord-dates" title="Select Date Range">
                <Icon name="calendar" size={14} />
                <input type="date" value={partFrom} onChange={(e) => { setPartFrom(e.target.value); setPartPage(1); }} title="From date" />
                <span className="muted">–</span>
                <input type="date" value={partTo} onChange={(e) => { setPartTo(e.target.value); setPartPage(1); }} title="To date" />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={resetPartFilters}>Reset</button>
            </form>

            <p className="cd-part-count">Showing {partFromN} to {partToN} of {fmtNum(partTotal)} participants</p>

            <div className="prod-table-wrap">
              <table className="table prod-table pts-table cd-part-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Membership</th>
                    <th>Entries</th>
                    <th>Best Score</th>
                    <th>Correct Answers</th>
                    <th>Points Earned</th>
                    <th>Status</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partRows.map((r) => {
                    const pst = partStatusMeta(r.status);
                    return (
                      <tr key={r.id} className={openPart?.id === r.id ? "is-open" : ""}>
                        <td className="muted">{r.n}</td>
                        <td>
                          <button className="pts-cust" type="button" onClick={() => { setOpenPart(r); setPartMenu(null); }}>
                            {r.avatar ? <img src={r.avatar} alt="" /> : <span className="cust-av">{(r.name || "C").slice(0, 2).toUpperCase()}</span>}
                            <span>
                              <strong>{r.name}</strong>
                              <div className="muted">{r.email}</div>
                              <div className="muted">{fmtPhone(r.phone)}</div>
                            </span>
                          </button>
                        </td>
                        <td><span className={`st-pill ${groupCls(r.level)}`}>{groupLabel(r.level)}</span></td>
                        <td>{r.entries}</td>
                        <td className="pts-pos">{fmtNum(r.score)}</td>
                        <td>{r.correct} / {r.total}</td>
                        <td>{fmtNum(r.points)}</td>
                        <td><span className={`st-pill ${pst.cls}`}>{pst.label}</span></td>
                        <td className="muted">{fmtLast(r.lastAt)}</td>
                        <td>
                          <div className="prod-row-acts">
                            <button type="button" title="View" onClick={() => { setOpenPart(r); setPartMenu(null); }}>
                              <Icon name="eye" size={14} />
                            </button>
                            <span className="ord-menu-wrap">
                              <button type="button" title="More" onClick={() => setPartMenu(partMenu === r.id ? null : r.id)}>
                                <Icon name="more" size={14} />
                              </button>
                              {partMenu === r.id && (
                                <div className="ord-menu">
                                  <button type="button" onClick={() => { setOpenPart(r); setPartMenu(null); }}>View participant</button>
                                  <button type="button" onClick={() => { setPartMenu(null); setModal("reminder"); }}>Send reminder</button>
                                  <button type="button" className="danger" onClick={() => { setOpenPart(r); setPartMenu(null); setModal("dq"); }}>Disqualify</button>
                                </div>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {partRows.length === 0 && (
                    <tr><td colSpan="10" className="muted">No participants match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="prod-pager cd-part-pager">
              <span />
              <div className="pager-btns">
                <button type="button" disabled={partPage <= 1} onClick={() => setPartPage(partPage - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                {pageNums.map((n, i) => (
                  <span key={n} className="cd-page-cluster">
                    {i > 0 && n - pageNums[i - 1] > 1 && <span className="muted">…</span>}
                    <button type="button" className={n === partPage ? "on" : ""} onClick={() => setPartPage(n)}>{n}</button>
                  </span>
                ))}
                <button type="button" disabled={partPage >= partPages} onClick={() => setPartPage(partPage + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <label className="pager-rows">
                Rows per page
                <select value={partLimit} onChange={(e) => { setPartLimit(Number(e.target.value)); setPartPage(1); }}>
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>

          <aside className="pts-side">
            <section className="card pts-widget">
              <h3>Participants Overview</h3>
              <ul className="pts-sum">
                <li><span>Total Participants</span><b>{fmtNum(pStats.total)}</b></li>
                <li>
                  <span>Active Participants</span>
                  <b>{fmtNum(pStats.active)} <em className="pts-pos">{Number(pStats.activePct || 0).toFixed(1)}%</em></b>
                </li>
                <li>
                  <span>Completed Participants</span>
                  <b>{fmtNum(pStats.completed)} <em>{Number(pStats.completedPct || 0).toFixed(1)}%</em></b>
                </li>
                <li>
                  <span>Disqualified</span>
                  <b className="danger-txt">{fmtNum(pStats.disqualified)} <em>{Number(pStats.disqualifiedPct || 0).toFixed(1)}%</em></b>
                </li>
                <li><span>Average Score</span><b>{Number(pStats.averageScore || 0).toFixed(1)} / {pStats.averageMax || 1000}</b></li>
                <li><span>Total Points Awarded</span><b>{fmtNum(pStats.pointsAwarded)}</b></li>
              </ul>
            </section>
            <section className="card pts-widget">
              <h3>Entries Overview</h3>
              <EntriesDonut parts={breakdown} total={entryTotal} />
            </section>
            <section className="card pts-widget">
              <h3>Top Participation Channels</h3>
              <ul className="cd-chan">
                {channels.map((ch) => (
                  <li key={ch.key}>
                    <div>
                      <span>{ch.label}</span>
                      <b>{fmtNum(ch.count)}</b>
                      <em>{Number(ch.pct).toFixed(1)}%</em>
                    </div>
                    <div className="cprof-bar"><i style={{ width: `${Math.min(100, ch.pct || 0)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card pts-widget">
              <h3>Recent Participant Activity</h3>
              <ul className="cprof-timeline">
                {partActivity.map((a, i) => (
                  <li key={`${a.title}-${i}`}>
                    <span className={`cprof-dot ${a.kind === "join" ? "join" : a.kind === "points" ? "points" : "done"}`}>
                      <Icon name={a.kind === "join" ? "users" : a.kind === "points" ? "star" : "trophy"} size={12} />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      {a.detail && <div className="muted">{a.detail}</div>}
                    </div>
                    <span className="muted">{a.at}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}

      {tab === "leaderboard" && (
        <section className="card pf-card">
          <h2>Leaderboard</h2>
          <table className="cd-table">
            <thead><tr><th>Rank</th><th>Customer</th><th>Score</th><th>Correct</th><th>Points</th><th>Last Activity</th></tr></thead>
            <tbody>
              {(ov.leaderboard || []).map((r) => (
                <tr key={r.rank}>
                  <td><RankBadge place={r.rank} /></td>
                  <td><span className="cd-cust"><img src={r.avatar} alt="" />{r.name}</span></td>
                  <td>{fmtNum(r.score)}</td>
                  <td>{r.correct}/{r.total}</td>
                  <td>{fmtNum(r.points)}</td>
                  <td className="muted">{r.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "entries" && (
        <>
        <div className="pts-layout has-side cd-part-layout">
          <section className="card pf-card">
            <form
              className="attr-filters"
              onSubmit={(e) => {
                e.preventDefault();
                setEntPage(1);
                loadEntries({ page: 1 });
              }}
            >
              <div className="prod-search">
                <Icon name="search" size={16} />
                <input
                  value={entQ}
                  onChange={(e) => { setEntQ(e.target.value); setEntPage(1); }}
                  placeholder="Search by customer, email or phone..."
                />
              </div>
              <select value={entParticipant} onChange={(e) => { setEntParticipant(e.target.value); setEntPage(1); }}>
                <option value="">All Participants</option>
                {namedPeople.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select value={entSet} onChange={(e) => { setEntSet(e.target.value); setEntPage(1); }}>
                <option value="">All Question Sets</option>
                <option value="1">Set 1</option>
                <option value="2">Set 2</option>
                <option value="3">Set 3</option>
              </select>
              <select value={entAttempt} onChange={(e) => { setEntAttempt(e.target.value); setEntPage(1); }}>
                <option value="">All Attempts</option>
                <option value="1">Attempt 1</option>
                <option value="2">Attempt 2</option>
                <option value="3">Attempt 3</option>
              </select>
              <select value={entStatus} onChange={(e) => { setEntStatus(e.target.value); setEntPage(1); }}>
                <option value="">All Status</option>
                <option value="best">Best Score</option>
                <option value="superseded">Superseded</option>
                <option value="progress">In Progress</option>
                <option value="abandoned">Abandoned</option>
              </select>
              <div className="ord-dates" title="Select Date Range">
                <Icon name="calendar" size={14} />
                <input type="date" value={entFrom} onChange={(e) => { setEntFrom(e.target.value); setEntPage(1); }} title="From date" />
                <span className="muted">–</span>
                <input type="date" value={entTo} onChange={(e) => { setEntTo(e.target.value); setEntPage(1); }} title="To date" />
              </div>
              <button className="btn btn-ghost btn-small" type="submit">
                <Icon name="filter" size={14} /> Filter
              </button>
              <button className="link-reset" type="button" onClick={resetEntryFilters}>Reset</button>
            </form>

            <p className="cd-part-count">Showing {entFromN} to {entToN} of {fmtNum(entTotal)} attempts (from {fmtNum(entUnique)} participants)</p>

            <div className="prod-table-wrap">
              <table className="table prod-table pts-table cd-part-table cd-ent-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participant</th>
                    <th>Membership</th>
                    <th>Attempt #</th>
                    <th>Question Set</th>
                    <th>Score</th>
                    <th>Correct / Total</th>
                    <th>Percentage</th>
                    <th>Points Earned</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entRows.map((r) => {
                    const stt = attemptStatusMeta(r.status);
                    return (
                      <tr
                        key={r.id}
                        className={selectedEntry?.id === r.id ? "is-open" : ""}
                        onClick={() => { setSelectedEntry(r); setEntMenu(null); }}
                      >
                        <td className="muted">{r.n}</td>
                        <td>
                          <button className="pts-cust" type="button" onClick={(e) => { e.stopPropagation(); setSelectedEntry(r); setEntMenu(null); }}>
                            {r.avatar ? <img src={r.avatar} alt="" /> : <span className="cust-av">{(r.name || "C").slice(0, 2).toUpperCase()}</span>}
                            <span>
                              <strong>{r.name}</strong>
                              <div className="muted">{r.email}</div>
                              <div className="muted">{fmtPhone(r.phone)}</div>
                            </span>
                          </button>
                        </td>
                        <td><span className={`st-pill ${groupCls(r.level)}`}>{groupLabel(r.level)}</span></td>
                        <td>{r.attempt}</td>
                        <td>Set {r.questionSet}</td>
                        <td className={r.status === "best" ? "pts-pos" : ""}>{fmtNum(r.score)}</td>
                        <td>{r.correct} / {r.total}</td>
                        <td>{r.pct}%</td>
                        <td>{fmtNum(r.points)}</td>
                        <td><span className={`st-pill ${stt.cls}`}>{stt.label}</span></td>
                        <td className="muted">{fmtLast(r.submittedAt)}</td>
                        <td>
                          <div className="prod-row-acts" onClick={(e) => e.stopPropagation()}>
                            <button type="button" title="View" onClick={() => { setSelectedEntry(r); setEntMenu(null); }}>
                              <Icon name="eye" size={14} />
                            </button>
                            <span className="ord-menu-wrap">
                              <button type="button" title="More" onClick={() => setEntMenu(entMenu === r.id ? null : r.id)}>
                                <Icon name="more" size={14} />
                              </button>
                              {entMenu === r.id && (
                                <div className="ord-menu">
                                  <button type="button" onClick={() => { setSelectedEntry(r); setEntMenu(null); setModal("answers"); }}>View full answers</button>
                                  <button type="button" onClick={() => { setEntMenu(null); downloadAnswers(); }}>Download answers</button>
                                  <button type="button" className="danger" onClick={() => { setSelectedEntry(r); setEntMenu(null); setModal("dq-entry"); }}>Disqualify entry</button>
                                </div>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {entRows.length === 0 && (
                    <tr><td colSpan="12" className="muted">No attempts match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="prod-pager cd-part-pager">
              <span />
              <div className="pager-btns">
                <button type="button" disabled={entPage <= 1} onClick={() => setEntPage(entPage - 1)}>
                  <Icon name="chevronLeft" size={14} />
                </button>
                {entPageNums.map((n, i) => (
                  <span key={n} className="cd-page-cluster">
                    {i > 0 && n - entPageNums[i - 1] > 1 && <span className="muted">…</span>}
                    <button type="button" className={n === entPage ? "on" : ""} onClick={() => setEntPage(n)}>{n}</button>
                  </span>
                ))}
                <button type="button" disabled={entPage >= entPages} onClick={() => setEntPage(entPage + 1)}>
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <label className="pager-rows">
                Rows per page
                <select value={entLimit} onChange={(e) => { setEntLimit(Number(e.target.value)); setEntPage(1); }}>
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </footer>
          </section>

          <aside className="pts-side">
            <section className="card pts-widget">
              <h3>Entries Overview</h3>
              <ul className="pts-sum">
                <li><span>Total Entries</span><b>{fmtNum(eStats.total)}</b></li>
                <li>
                  <span>Completed</span>
                  <b>{fmtNum(eStats.completed)} <em className="pts-pos">{Number(eStats.completedPct || 0).toFixed(1)}%</em></b>
                </li>
                <li>
                  <span>In Progress</span>
                  <b>{fmtNum(eStats.inProgress)} <em>{Number(eStats.inProgressPct || 0).toFixed(1)}%</em></b>
                </li>
                <li>
                  <span>Abandoned</span>
                  <b className="danger-txt">{fmtNum(eStats.abandoned)} <em>{Number(eStats.abandonedPct || 0).toFixed(1)}%</em></b>
                </li>
                <li><span>Unique Participants</span><b>{fmtNum(eStats.uniqueParticipants)}</b></li>
                <li><span>Avg Attempts per Participant</span><b>{Number(eStats.avgAttempts || 0).toFixed(2)}</b></li>
                <li><span>Best Score</span><b className="pts-pos">{fmtNum(eStats.bestScore)}</b></li>
                <li><span>Average Score</span><b>{Number(eStats.averageScore || 0).toFixed(1)} / {eStats.averageMax || 1000}</b></li>
                <li><span>Total Points Distributed</span><b>{fmtNum(eStats.pointsAwarded)}</b></li>
              </ul>
            </section>
            <section className="card pts-widget">
              <h3>Status Distribution</h3>
              <EntriesDonut parts={eBreakdown} total={eStats.total} sub="Attempts" />
            </section>
            <section className="card pts-widget">
              <h3>Quick Actions</h3>
              <div className="cd-actions">
                <button type="button" onClick={() => setModal("reminder")}><Icon name="send" size={14} /> Send Reminder To Participants</button>
                <button type="button" onClick={exportEntries}><Icon name="download" size={14} /> Export This Report</button>
                <button type="button" onClick={downloadAnswers}><Icon name="file" size={14} /> Download All Answers</button>
                <button type="button" onClick={() => setModal("dq-entry")}><Icon name="x" size={14} /> Disqualify Entry</button>
                <button type="button" onClick={() => setModal("rules")}><Icon name="file" size={14} /> View Rules & Scoring</button>
              </div>
            </section>
            <section className="card pts-widget">
              <h3>Recent Activity</h3>
              <ul className="cprof-timeline">
                {eActivity.map((a, i) => (
                  <li key={`${a.title}-${i}`}>
                    <span className={`cprof-dot ${a.kind === "join" ? "join" : a.kind === "points" ? "points" : "done"}`}>
                      <Icon name={a.kind === "join" ? "users" : a.kind === "points" ? "star" : "trophy"} size={12} />
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      {a.detail && <div className="muted">{a.detail}</div>}
                    </div>
                    <span className="muted">{a.at}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        {selectedEntry && (
          <div className="cd-attempt-grid">
            <section className="card pf-card">
              <h2>Attempt Details</h2>
              <div className="cust-drawer-top cd-attempt-person">
                {selectedEntry.avatar ? <img src={selectedEntry.avatar} alt="" /> : <span className="cust-av lg">{(selectedEntry.name || "C").slice(0, 2).toUpperCase()}</span>}
                <div>
                  <h3>{selectedEntry.name}</h3>
                  <div className="muted">{selectedEntry.email} · {fmtPhone(selectedEntry.phone)}</div>
                  <div className="cust-badges">
                    <span className={`st-pill ${groupCls(selectedEntry.level)}`}>{groupLabel(selectedEntry.level)} Member</span>
                    <span className={`st-pill ${attemptStatusMeta(selectedEntry.status).cls}`}>{attemptStatusMeta(selectedEntry.status).label}</span>
                  </div>
                </div>
              </div>
              <div className="cust-mini cd-attempt-metrics">
                <article><div className="muted">Score</div><b className="pts-pos">{fmtNum(selectedEntry.score)} / 1000</b></article>
                <article><div className="muted">Correct Answers</div><b>{selectedEntry.correct} / {selectedEntry.total}</b></article>
                <article><div className="muted">Percentage</div><b>{selectedEntry.pct}%</b></article>
                <article><div className="muted">Points Earned</div><b>{fmtNum(selectedEntry.points)}</b></article>
                <article><div className="muted">Submitted At</div><b>{fmtLast(selectedEntry.submittedAt)}</b></article>
                <article><div className="muted">Time Taken</div><b>{selectedEntry.timeTaken}</b></article>
              </div>
              <p className="muted">Attempt #{selectedEntry.attempt} · Question Set {selectedEntry.questionSet}</p>
              {selectedEntry.status === "best" && (
                <div className="cd-best-note">This is the best score for this participant and counts towards the leaderboard and winner selection.</div>
              )}
            </section>
            <section className="card pf-card">
              <div className="cprof-card-head">
                <h2>Question Review</h2>
                <button className="link-reset" type="button" onClick={() => setModal("answers")}>View Full Answers</button>
              </div>
              <p className="muted">Set {selectedEntry.questionSet}</p>
              <EntriesDonut
                parts={[
                  { key: "ok", label: "Correct", count: selectedEntry.correct, pct: selectedEntry.pct, color: "#16A34A" },
                  { key: "bad", label: "Incorrect", count: selectedEntry.incorrect || Math.max(0, (selectedEntry.total || 20) - (selectedEntry.correct || 0) - (selectedEntry.unanswered || 0)), pct: Math.round((((selectedEntry.incorrect || 0) / (selectedEntry.total || 20)) * 100) || 0), color: "#DC2626" },
                  { key: "skip", label: "Unanswered", count: selectedEntry.unanswered || 0, pct: Math.round((((selectedEntry.unanswered || 0) / (selectedEntry.total || 20)) * 100) || 0), color: "#94A3B8" },
                ]}
                total={selectedEntry.total || 20}
                sub="Questions"
              />
              {selectedWrong && (
                <div className="cd-wrong">
                  <strong>Q{selectedWrong.q}. {selectedWrong.prompt}</strong>
                  <div className={`cd-ans ${selectedWrong.selected ? "bad" : "skip"}`}>
                    <Icon name="x" size={14} /> Selected Answer: {selectedWrong.selected || "Unanswered"}
                    {selectedWrong.selected ? " · Incorrect" : ""}
                  </div>
                  <div className="cd-ans ok">
                    <Icon name="check" size={14} /> Correct Answer: {selectedWrong.correct}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        </>
      )}

      {tab === "winners" && (
        <>
        <section className="pts-stats five">
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Total Winners</div>
              <div className="prod-stat-n purple">{fmtNum(wStats.totalWinners)}</div>
              <div className="cat-stat-hint">Across all prize tiers</div>
            </div>
            <div className="prod-stat-icon purple"><Icon name="trophy" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Prizes Awarded</div>
              <div className="prod-stat-n green">{fmtNum(wStats.prizesAwarded)}</div>
              <div className="cat-stat-hint">{Number(wStats.awardedPct || 0)}% of winners</div>
            </div>
            <div className="prod-stat-icon green"><Icon name="gift" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Total Prize Pool</div>
              <div className="prod-stat-n gold">{kes(wStats.prizePoolKes || 0)}</div>
              <div className="cat-stat-hint">{wStats.prizePoolNote || "Products, Vouchers & Points"}</div>
            </div>
            <div className="prod-stat-icon gold"><Icon name="star" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Points Awarded</div>
              <div className="prod-stat-n red">{fmtNum(wStats.pointsAwarded)}</div>
              <div className="cat-stat-hint">{wStats.pointsNote || "To all winners"}</div>
            </div>
            <div className="prod-stat-icon red"><Icon name="star" size={16} /></div>
          </article>
          <article className="prod-stat cat-stat">
            <div>
              <div className="muted">Disbursed</div>
              <div className="prod-stat-n green">{kes(wStats.disbursedKes || 0)}</div>
              <div className="cat-stat-hint">{Number(wStats.disbursedPct || 0)}% disbursed</div>
            </div>
            <div className="prod-stat-icon green"><Icon name="checkCircle" size={16} /></div>
          </article>
        </section>

        <div className="pts-layout has-side cd-part-layout">
          <section className="card pf-card">
            <h2>Winners by Prize Tier</h2>
            <div className="prod-table-wrap">
              <table className="table prod-table pts-table cd-part-table cd-win-table">
                <thead>
                  <tr>
                    <th>Rank / Tier</th>
                    <th>Winner</th>
                    <th>Membership</th>
                    <th>Score</th>
                    <th>Points Won</th>
                    <th>Prize</th>
                    <th>Prize Value</th>
                    <th>Status</th>
                    <th>Awarded At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wTiers.map((row) => {
                    const stt = winStatusMeta(row.status);
                    const people = row.people || [row];
                    return (
                      <tr key={row.id} className={openWinner?.id === row.id ? "is-open" : ""}>
                        <td>
                          <span className={`cd-rank ${row.rankKind === "gold" ? "gold" : row.rankKind === "silver" ? "silver" : row.rankKind === "bronze" ? "bronze" : "plain"}`}>
                            {row.rankKind === "gold" ? "1" : row.rankKind === "silver" ? "2" : row.rankKind === "bronze" ? "3" : row.rankKind === "consolation" ? "C" : "P"}
                          </span>
                          <div className="cd-tier-lbl">{row.rankLabel}</div>
                        </td>
                        <td>
                          <button className="pts-cust" type="button" onClick={() => { setOpenWinner(row); setWinMenu(null); }}>
                            {row.grouped ? (
                              <span className="cd-av-stack">
                                {people.slice(0, 4).map((p) => (
                                  p.avatar ? <img key={p.id} src={p.avatar} alt="" /> : <span key={p.id} className="cust-av">{(p.name || "C").slice(0, 2).toUpperCase()}</span>
                                ))}
                              </span>
                            ) : (
                              row.avatar ? <img src={row.avatar} alt="" /> : <span className="cust-av">{(row.name || "C").slice(0, 2).toUpperCase()}</span>
                            )}
                            <span>
                              <strong>{row.name}</strong>
                              {!row.grouped && (
                                <>
                                  <div className="muted">{row.email}</div>
                                  <div className="muted">{fmtPhone(row.phone)}</div>
                                </>
                              )}
                              {row.grouped && <div className="muted">{row.winnerCount} winners in this tier</div>}
                            </span>
                          </button>
                        </td>
                        <td><span className={`st-pill ${row.level === "MIXED" ? "grp-mixed" : groupCls(row.level)}`}>{row.membershipLabel || groupLabel(row.level)}</span></td>
                        <td className={row.rankKind === "gold" ? "pts-pos" : ""}>{row.scoreLabel || fmtNum(row.score)}</td>
                        <td>{fmtNum(row.pointsWon)}</td>
                        <td>
                          <span className="cd-prize-cell">
                            <span className={`cd-prize-ico p${row.rankKind === "gold" ? 1 : row.rankKind === "silver" ? 2 : row.rankKind === "bronze" ? 3 : 4}`}>
                              <Icon name={prizeIcon(row.prizeKind)} size={12} />
                            </span>
                            {row.prize}
                          </span>
                        </td>
                        <td>{row.prizeValueLabel}</td>
                        <td><span className={`st-pill ${stt.cls}`}>{stt.label}</span></td>
                        <td className="muted">{fmtLast(row.awardedAt)}</td>
                        <td>
                          <div className="prod-row-acts">
                            <button type="button" title="View" onClick={() => { setOpenWinner(row); setWinMenu(null); }}>
                              <Icon name="eye" size={14} />
                            </button>
                            <span className="ord-menu-wrap">
                              <button type="button" title="More" onClick={() => setWinMenu(winMenu === row.id ? null : row.id)}>
                                <Icon name="more" size={14} />
                              </button>
                              {winMenu === row.id && (
                                <div className="ord-menu">
                                  <button type="button" onClick={() => { setOpenWinner(row); setWinMenu(null); }}>View winner</button>
                                  <button type="button" onClick={() => { setOpenWinner(row); setWinMenu(null); setModal("congrats"); }}>Send congratulations</button>
                                  <button type="button" onClick={() => { setOpenWinner(row); setWinMenu(null); setModal("certificate"); }}>Print certificate</button>
                                </div>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {wTiers.length === 0 && (
                    <tr><td colSpan="10" className="muted">Winners will appear here when the competition ends.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="cd-note" style={{ marginTop: 14 }}>
              <Icon name="help" size={16} />
              <p>Winners are automatically selected based on the configured rules. The system ensures fairness and prevents duplicate rewards.</p>
            </div>
          </section>

          <aside className="pts-side">
            <section className="card pts-widget">
              <h3>Winner Summary</h3>
              <ul className="pts-sum">
                <li><span>Total</span><b>{fmtNum(wSummary.total)}</b></li>
                <li><span>Awarded</span><b className="pts-pos">{fmtNum(wSummary.awarded)}</b></li>
                <li><span>Pending</span><b>{fmtNum(wSummary.pending)}</b></li>
                <li><span>Declined</span><b>{fmtNum(wSummary.declined)}</b></li>
                <li><span>Disqualified</span><b className="danger-txt">{fmtNum(wSummary.disqualified)}</b></li>
              </ul>
              <div className="cd-win-progress">
                <div className="cd-win-bar"><i style={{ width: `${wSummary.progressPct || 0}%` }} /></div>
                <span>{wSummary.progressLabel || "0% Prizes Distributed"}</span>
              </div>
            </section>
            <section className="card pts-widget">
              <h3>Prize Distribution Status</h3>
              <EntriesDonut parts={wBreakdown} total={wStats.prizesAwarded || 20} sub="Total Prizes" />
            </section>
            <section className="card pts-widget">
              <h3>Quick Actions</h3>
              <div className="cd-actions">
                <button type="button" onClick={() => setModal("winners")}><Icon name="megaphone" size={14} /> Announce Winners</button>
                <button type="button" onClick={() => setModal("congrats")}><Icon name="mail" size={14} /> Send Congratulations (Email/SMS)</button>
                <button type="button" onClick={exportWinners}><Icon name="download" size={14} /> Export Winners List</button>
                <button type="button" onClick={exportPrizeReport}><Icon name="file" size={14} /> Export Prize Distribution Report</button>
                <button type="button" onClick={() => setModal("certificate")}><Icon name="print" size={14} /> Print Certificate</button>
              </div>
            </section>
          </aside>
        </div>

        <div className="cd-attempt-grid">
          <section className="card pf-card">
            <h2>Prize Distribution Overview</h2>
            <div className="prod-table-wrap">
              <table className="table prod-table">
                <thead>
                  <tr>
                    <th>Prize Type</th>
                    <th>Total</th>
                    <th>Disbursed</th>
                    <th>Pending</th>
                    <th>Declined</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {wTypes.map((r) => (
                    <tr key={r.type}>
                      <td>{r.type}</td>
                      <td>{fmtNum(r.total)}</td>
                      <td className="pts-pos">{fmtNum(r.disbursed)}</td>
                      <td>{fmtNum(r.pending)}</td>
                      <td>{fmtNum(r.declined)}</td>
                      <td>{kes(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card pf-card">
            <h2>Recent Prize Distribution Activity</h2>
            <ul className="cprof-timeline">
              {wActivity.map((a, i) => (
                <li key={`${a.title}-${i}`}>
                  <span className={`cprof-dot ${a.kind === "points" ? "points" : "done"}`}>
                    <Icon name={a.kind === "points" ? "star" : "check"} size={12} />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    {a.detail && <div className="muted">{a.detail}</div>}
                  </div>
                  <span className="muted">{a.at}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card pf-card">
          <h2>Important Notes</h2>
          <ul className="cd-rules">
            {wNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
        </>
      )}

      {tab === "prizes" && (
        <CompetitionPrizes
          competition={c}
          onToast={setToast}
          onError={setError}
          tabBar={(
            <div className="pf-tabs">
              {TABS.map((t) => (
                <button key={t.id} type="button" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        />
      )}

      {tab === "analytics" && (
        <section className="card pf-card">
          <h2>Analytics</h2>
          {chart.length ? <LineChart points={ov.chart || []} /> : <p className="muted">No analytics yet.</p>}
        </section>
      )}

      {tab === "activity" && (
        <section className="card pf-card">
          <h2>Activity Log</h2>
          <ul className="cprof-timeline">
            {(ov.activity || []).map((a, i) => (
              <li key={`${a.title}-${i}`}>
                <span className={`cprof-dot ${a.kind === "join" ? "join" : a.kind === "points" ? "points" : "done"}`}>
                  <Icon name={a.kind === "join" ? "users" : "trophy"} size={12} />
                </span>
                <div><strong>{a.title}</strong><div className="muted">{a.detail}</div></div>
                <span className="muted">{a.at}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "winners" ? (
        <div className="cd-ended">
          <Icon name="checkCircle" size={16} />
          <p>This competition has ended. All data is final and locked.</p>
        </div>
      ) : tab === "prizes" ? null : (
      <div className="cd-note">
        <Icon name="help" size={16} />
        <p>
          {tab === "participants"
            ? "Participants are updated in real-time. Scores, points and rankings are automatically calculated based on competition rules."
            : tab === "entries"
              ? "Attempts are stored per submission. The best score for each participant counts towards the leaderboard and winner selection."
              : "The system automatically calculates scores, rankings and awards points based on the configured rules. Winners will be selected and notified automatically when the competition ends."}
        </p>
      </div>
      )}

      {openPart && modal !== "dq" && (
        <div className="prod-modal" onClick={() => setOpenPart(null)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cust-drawer-top">
              {openPart.avatar ? <img src={openPart.avatar} alt="" /> : <span className="cust-av lg">{(openPart.name || "C").slice(0, 2).toUpperCase()}</span>}
              <div>
                <h2>{openPart.name}</h2>
                <div className="muted">{openPart.email}</div>
                <div className="cust-badges">
                  <span className={`st-pill ${partStatusMeta(openPart.status).cls}`}>{partStatusMeta(openPart.status).label}</span>
                  <span className={`st-pill ${groupCls(openPart.level)}`}>{groupLabel(openPart.level)} Member</span>
                </div>
              </div>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setOpenPart(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="ord-meta">
              <div><Icon name="mail" size={14} /> {openPart.email}</div>
              <div><Icon name="phone" size={14} /> {fmtPhone(openPart.phone)}</div>
            </div>
            <div className="cust-mini">
              <article><div className="muted">Entries</div><b>{openPart.entries}</b></article>
              <article><div className="muted">Best Score</div><b className="pts-pos">{fmtNum(openPart.score)}</b></article>
              <article><div className="muted">Correct Answers</div><b>{openPart.correct} / {openPart.total}</b></article>
              <article><div className="muted">Points Earned</div><b>{fmtNum(openPart.points)}</b></article>
            </div>
            <dl className="ord-sum">
              <div><dt>Last Activity</dt><dd>{fmtLast(openPart.lastAt)}</dd></div>
              <div><dt>Entry Type</dt><dd>{openPart.entryType === "repeat" ? "Repeat Entry" : openPart.entryType === "referral" ? "Referral" : "Quiz"}</dd></div>
              <div><dt>Channel</dt><dd>{openPart.channel === "email" ? "Email Invite" : openPart.channel === "social" ? "Social Media" : openPart.channel === "website" ? "Website" : "App"}</dd></div>
            </dl>
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setOpenPart(null); setModal("reminder"); }}>Send reminder</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setOpenPart(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {openWinner && !modal && (
        <div className="prod-modal" onClick={() => setOpenWinner(null)}>
          <div className="card prod-modal-card is-wide" onClick={(e) => e.stopPropagation()}>
            <div className="cust-drawer-top">
              {openWinner.grouped ? (
                <span className="cd-av-stack lg">
                  {(openWinner.people || []).slice(0, 4).map((p) => (
                    p.avatar ? <img key={p.id} src={p.avatar} alt="" /> : <span key={p.id} className="cust-av">{(p.name || "C").slice(0, 2).toUpperCase()}</span>
                  ))}
                </span>
              ) : (
                openWinner.avatar ? <img src={openWinner.avatar} alt="" /> : <span className="cust-av lg">{(openWinner.name || "C").slice(0, 2).toUpperCase()}</span>
              )}
              <div>
                <h2>{openWinner.name}</h2>
                <div className="muted">{openWinner.rankLabel}</div>
                <div className="cust-badges">
                  <span className={`st-pill ${winStatusMeta(openWinner.status).cls}`}>{winStatusMeta(openWinner.status).label}</span>
                  <span className={`st-pill ${openWinner.level === "MIXED" ? "grp-mixed" : groupCls(openWinner.level)}`}>{openWinner.membershipLabel || groupLabel(openWinner.level)}</span>
                </div>
              </div>
              <button className="icon-btn" type="button" aria-label="Close" onClick={() => setOpenWinner(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="cust-mini">
              <article><div className="muted">Score</div><b className="pts-pos">{openWinner.scoreLabel || fmtNum(openWinner.score)}</b></article>
              <article><div className="muted">Points Won</div><b>{fmtNum(openWinner.pointsWon)}</b></article>
              <article><div className="muted">Prize Value</div><b>{openWinner.prizeValueLabel}</b></article>
              <article><div className="muted">Awarded At</div><b>{fmtLast(openWinner.awardedAt)}</b></article>
            </div>
            <p>{openWinner.prize}</p>
            {openWinner.grouped && (
              <ul className="cd-win-people">
                {(openWinner.people || []).map((p) => (
                  <li key={p.id}>
                    {p.avatar ? <img src={p.avatar} alt="" /> : <span className="cust-av">{(p.name || "C").slice(0, 2).toUpperCase()}</span>}
                    <span>
                      <strong>{p.name}</strong>
                      <div className="muted">{p.email} · {fmtPhone(p.phone)}</div>
                    </span>
                    <b>{fmtNum(p.score)}</b>
                  </li>
                ))}
              </ul>
            )}
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { setModal("congrats"); }}>Send congratulations</button>
              <button className="btn btn-purple btn-small" type="button" onClick={() => setOpenWinner(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="prod-modal" onClick={() => { if (modal === "dq") setOpenPart(null); setModal(null); }}>
          <div className={`card prod-modal-card${modal === "answers" || modal === "results" ? " is-wide" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>
                {modal === "pause" && "Pause Competition"}
                {modal === "resume" && "Resume Competition"}
                {modal === "end" && "End Competition"}
                {modal === "reminder" && "Send Reminder"}
                {modal === "rules" && "Competition Rules"}
                {modal === "winners" && "Announce Winners"}
                {modal === "dq" && "Disqualify Participant"}
                {modal === "dq-entry" && "Disqualify Entry"}
                {modal === "answers" && "Full Answers"}
                {modal === "results" && "Full Results"}
                {modal === "congrats" && "Send Congratulations"}
                {modal === "certificate" && "Print Certificate"}
              </h2>
              <button className="icon-btn" type="button" onClick={() => { if (modal === "dq") setOpenPart(null); setModal(null); }}><Icon name="x" size={16} /></button>
            </div>
            {modal === "pause" && <p>Participants will not be able to enter until you resume. Continue?</p>}
            {modal === "resume" && <p>Make this competition live again for eligible customers?</p>}
            {modal === "end" && <p>This will close entries and move the competition to Completed. Winners can then be announced.</p>}
            {modal === "reminder" && <p>Send a reminder to all {fmtNum(c.participantCount)} participants who have not completed their entry?</p>}
            {modal === "rules" && (
              <div>
                <p>{c.description}</p>
                <ul className="cd-rules">
                  <li>Open to {who.toLowerCase()}.</li>
                  <li>Maximum {ov.maxAttempts} attempts per user.</li>
                  <li>{ov.pointsParticipation} points for participating, {ov.pointsCorrect} points per correct answer.</li>
                </ul>
              </div>
            )}
            {modal === "winners" && <p>Announce winners now? They will be notified by email and SMS based on the selected prize tiers.</p>}
            {modal === "dq" && <p>Disqualify {openPart?.name || "this participant"} from {c.title}? They will no longer appear on the leaderboard.</p>}
            {modal === "dq-entry" && <p>Disqualify {selectedEntry ? `${selectedEntry.name} · Attempt #${selectedEntry.attempt}` : "this entry"} from {c.title}? It will no longer count towards the leaderboard.</p>}
            {modal === "congrats" && <p>Send congratulations to {openWinner?.grouped ? `${openWinner.winnerCount} winners` : (openWinner?.name || "all winners")} by email and SMS?</p>}
            {modal === "certificate" && (
              <div className="cd-cert">
                <p>NETZA Kenya · {c.title}</p>
                <h3>{openWinner?.grouped ? openWinner.name : (openWinner?.name || wPeople[0]?.name || "Winner")}</h3>
                <p>{openWinner?.rankLabel || wPeople[0]?.rankLabel} · {openWinner?.prize || wPeople[0]?.prize}</p>
              </div>
            )}
            {modal === "results" && (
              <div className="prod-table-wrap">
                <table className="table prod-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Winner</th>
                      <th>Score</th>
                      <th>Prize</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wPeople.map((p) => (
                      <tr key={p.id}>
                        <td>{p.rankLabel}</td>
                        <td>{p.name}</td>
                        <td>{fmtNum(p.score)}</td>
                        <td>{p.prize}</td>
                        <td><span className={`st-pill ${winStatusMeta(p.status).cls}`}>{winStatusMeta(p.status).label}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {modal === "answers" && selectedEntry && (
              <div>
                <p className="muted">{selectedEntry.name} · Attempt #{selectedEntry.attempt} · Set {selectedEntry.questionSet}</p>
                <ul className="cd-answer-list">
                  {attemptAnswerRows(selectedEntry).map((row) => (
                    <li key={row.q} className={row.result}>
                      <strong>Q{row.q}. {row.prompt}</strong>
                      <div className={`cd-ans ${row.result === "incorrect" ? "bad" : row.result === "unanswered" ? "skip" : "ok"}`}>
                        Selected: {row.selected || "Unanswered"}
                      </div>
                      <div className="cd-ans ok">Correct: {row.correct}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="prod-actions" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" type="button" onClick={() => { if (modal === "dq") setOpenPart(null); setModal(null); }}>{modal === "answers" || modal === "results" || modal === "certificate" ? "Close" : "Cancel"}</button>
              {modal === "pause" && <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={() => patch({ isActive: false }, "Competition paused")}>Pause</button>}
              {modal === "resume" && <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={() => patch({ isActive: true }, "Competition resumed")}>Resume</button>}
              {modal === "end" && <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={() => patch({ status: "completed", isActive: false }, "Competition ended")}>End now</button>}
              {modal === "reminder" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setToast("Reminder queued for participants"); }}>Send reminder</button>}
              {modal === "winners" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setToast("Winners announced to all participants"); }}>Announce</button>}
              {modal === "dq" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setOpenPart(null); setToast(`${openPart?.name || "Participant"} disqualified`); }}>Disqualify</button>}
              {modal === "dq-entry" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setToast(`${selectedEntry?.name || "Entry"} · Attempt #${selectedEntry?.attempt || "—"} disqualified`); }}>Disqualify</button>}
              {modal === "congrats" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setToast("Congratulations queued for email and SMS"); }}>Send</button>}
              {modal === "certificate" && <button className="btn btn-purple btn-small" type="button" onClick={() => { setModal(null); setToast("Certificate sent to printer"); }}>Print</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
