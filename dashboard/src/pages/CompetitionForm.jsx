import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, uploadImage } from "../api";
import { Icon } from "../icons";
import { useAuth } from "../auth";

const STEPS = [
  { id: "basic", label: "Basic Information" },
  { id: "rules", label: "Rules & Eligibility" },
  { id: "actions", label: "Participation & Actions" },
  { id: "prizes", label: "Prizes & Rewards" },
  { id: "display", label: "Display & Promotion" },
  { id: "review", label: "Review & Publish" },
];

const TYPES = [
  { id: "quiz", label: "Quiz" },
  { id: "referral", label: "Referral" },
  { id: "engagement", label: "Engagement" },
  { id: "purchase", label: "Purchase" },
  { id: "lucky_draw", label: "Lucky Draw" },
];

const CATEGORIES = ["Technology", "Networking", "CCTV", "Access Control", "Cabling", "Wi-Fi", "Promotions", "General"];

const TIPS = [
  "Make your title short, clear and attractive",
  "Write a description that explains how to win",
  "Choose prizes that motivate customers",
  "Set a realistic duration so more customers can join",
  "Preview the competition before you publish",
];

function Req() {
  return <span className="pf-req">*</span>;
}

function fmtNum(n) {
  return new Intl.NumberFormat("en-KE").format(n || 0);
}

function fmtDay(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function eatInputFromIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function eatInputToIso(value) {
  if (!value) return "";
  const d = new Date(`${value}:00+03:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function textToHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function shiftDays(value, days) {
  if (!value) return "";
  const d = new Date(value);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function parseDetails(raw) {
  try {
    return JSON.parse(raw || "{}") || {};
  } catch {
    return {};
  }
}

function emptyForm(actor) {
  return {
    title: "",
    type: "quiz",
    category: "Technology",
    shortDescription: "",
    description: "",
    imageUrl: "",
    startsAt: "",
    endsAt: "",
    timezone: "Africa/Nairobi",
    isActive: true,
    visibility: "public",
    whoCanParticipate: "all",
    createdBy: actor,
    prizes: [{ name: "", points: 0, winners: 1 }],
    allowMultipleEntries: true,
    requireLogin: true,
    showLeaderboard: true,
    autoSelectWinners: true,
    winnersAnnounced: "after_end",
    resultsVisibility: "public",
    pointsAwardedType: "instant",
    estimatedReach: 0,
    estimatedReachPct: 18.2,
    publishState: "draft",
    details: {
      minOrderKes: 0,
      minPoints: 0,
      membershipLevels: ["BRONZE", "SILVER", "GOLD", "PLATINUM"],
      maxEntries: 1,
      actions: ["quiz"],
      featured: true,
      homepage: false,
      channels: ["app"],
    },
  };
}

function fromDoc(c, actor) {
  const prizes = (c.prizes || []).filter((p) => p.name);
  return {
    ...emptyForm(c.createdBy || actor),
    title: c.title || "",
    type: c.type || "quiz",
    category: c.category || "Technology",
    shortDescription: c.shortDescription || "",
    description: c.description || "",
    imageUrl: c.imageUrl || "",
    startsAt: eatInputFromIso(c.startsAt),
    endsAt: eatInputFromIso(c.endsAt),
    timezone: c.timezone || "Africa/Nairobi",
    isActive: c.isActive !== false && c.status !== "cancelled",
    visibility: c.visibility || "public",
    whoCanParticipate: c.whoCanParticipate || "all",
    createdBy: c.createdBy || actor,
    prizes: prizes.length ? prizes.map((p) => ({ name: p.name || "", points: p.points || 0, winners: p.winners || 1 })) : [{ name: c.prize || "", points: c.pointsToWin || 0, winners: 1 }],
    allowMultipleEntries: c.allowMultipleEntries !== false,
    requireLogin: c.requireLogin !== false,
    showLeaderboard: c.showLeaderboard !== false,
    autoSelectWinners: c.autoSelectWinners !== false,
    winnersAnnounced: c.winnersAnnounced || "after_end",
    resultsVisibility: c.resultsVisibility || "public",
    pointsAwardedType: c.pointsAwardedType || "instant",
    estimatedReach: c.estimatedReach || 0,
    estimatedReachPct: c.estimatedReachPct || 18.2,
    publishState: c.publishState || "published",
    details: { ...emptyForm(actor).details, ...parseDetails(c.detailsJson) },
  };
}

function Radio({ name, value, current, onChange, label, hint }) {
  const on = current === value;
  return (
    <label className={`ce-radio ${on ? "on" : ""}`}>
      <input type="radio" name={name} checked={on} onChange={() => onChange(value)} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

function Switch({ on, onClick }) {
  return (
    <button className={`pts-switch ${on ? "on" : ""}`} type="button" onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

export default function CompetitionForm() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id;
  const actor = `${user?.firstName || "Admin"} ${user?.lastName || "User"}`.trim();
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const step = STEPS.some((s) => s.id === params.get("step")) ? params.get("step") : "basic";
  const [form, setForm] = useState(() => emptyForm(actor));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [preview, setPreview] = useState(false);
  const [editorMax, setEditorMax] = useState(false);
  const [editorBoot, setEditorBoot] = useState({ key: "new", html: "" });
  const [customBanner, setCustomBanner] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDetail(key, value) {
    setForm((f) => ({ ...f, details: { ...f.details, [key]: value } }));
  }

  function setStep(next) {
    if (step === "basic") {
      const text = editorRef.current?.innerText || form.description;
      set("description", text);
      setEditorBoot((b) => ({ key: b.key, html: textToHtml(text) }));
    }
    const p = new URLSearchParams(params);
    p.set("step", next);
    setParams(p, { replace: true });
  }

  useEffect(() => {
    if (isNew) {
      const blank = emptyForm(actor);
      setForm(blank);
      setEditorBoot({ key: "new", html: "" });
      setCustomBanner(false);
      return;
    }
    api(`/admin/competitions/${id}`)
      .then(({ competition: c }) => {
        const next = fromDoc(c, actor);
        setForm(next);
        setEditorBoot({ key: id, html: textToHtml(next.description) });
        setCustomBanner(Boolean(next.imageUrl && (/^https?:\/\//i.test(next.imageUrl) || String(next.imageUrl).startsWith("data:"))));
      })
      .catch((err) => setError(err.message || "Could not load competition."));
  }, [id, isNew, actor]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const timeline = useMemo(() => {
    const start = eatInputToIso(form.startsAt);
    const end = eatInputToIso(form.endsAt);
    return [
      { id: "create", label: "Create", date: start ? shiftDays(start, -1) : "" },
      { id: "publish", label: "Publish", date: start },
      { id: "live", label: "Live", date: start },
      { id: "end", label: "End", date: end },
      { id: "winners", label: "Winners", date: end ? shiftDays(end, 1) : "" },
    ];
  }, [form.startsAt, form.endsAt]);

  function payload(publishState) {
    return {
      title: form.title,
      type: form.type,
      category: form.category,
      shortDescription: form.shortDescription,
      description: form.description,
      imageUrl: form.imageUrl,
      startsAt: eatInputToIso(form.startsAt) || null,
      endsAt: eatInputToIso(form.endsAt) || null,
      timezone: form.timezone,
      isActive: publishState === "published" ? form.isActive : false,
      visibility: form.visibility,
      whoCanParticipate: form.whoCanParticipate,
      createdBy: form.createdBy,
      prizes: form.prizes.filter((p) => p.name),
      allowMultipleEntries: form.allowMultipleEntries,
      requireLogin: form.requireLogin,
      showLeaderboard: form.showLeaderboard,
      autoSelectWinners: form.autoSelectWinners,
      winnersAnnounced: form.winnersAnnounced,
      resultsVisibility: form.resultsVisibility,
      pointsAwardedType: form.pointsAwardedType,
      estimatedReach: Number(form.estimatedReach) || 0,
      estimatedReachPct: Number(form.estimatedReachPct) || 18.2,
      publishState,
      detailsJson: JSON.stringify(form.details || {}),
    };
  }

  async function persist(publishState, { nextStep } = {}) {
    if (!form.title.trim()) {
      setError("Title is required");
      setStep("basic");
      return null;
    }
    setBusy(true);
    setError("");
    try {
      let saved;
      const body = payload(publishState);
      if (isNew) {
        const d = await api("/admin/competitions", { method: "POST", body: JSON.stringify(body) });
        saved = d.competition;
        if (saved?.id) navigate(`/competitions/${saved.id}/edit?step=${nextStep || step}`, { replace: true });
      } else {
        const d = await api(`/admin/competitions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        saved = d.competition;
      }
      setToast(publishState === "draft" ? "Saved as draft" : "Competition published");
      return saved;
    } catch (err) {
      setError(err.message || "Could not save competition.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    await persist("draft", { nextStep: step });
  }

  async function publish() {
    const saved = await persist("published", { nextStep: step });
    if (saved) navigate(`/competitions/${saved.id || id}`);
  }

  async function saveContinue() {
    const next = stepIndex < STEPS.length - 1 ? STEPS[stepIndex + 1].id : null;
    const saved = await persist(form.publishState === "published" ? "published" : "draft", { nextStep: next || step });
    if (!saved) return;
    if (!next) navigate(`/competitions/${saved.id || id}`);
    else if (!isNew) setStep(next);
  }

  function cmd(name) {
    document.execCommand(name, false, null);
    editorRef.current?.focus();
  }

  function addLink() {
    const url = window.prompt("Link URL", "https://");
    if (url) document.execCommand("createLink", false, url);
    editorRef.current?.focus();
  }

  function addEditorImage() {
    const url = window.prompt("Image URL", "https://");
    if (url) document.execCommand("insertImage", false, url);
    editorRef.current?.focus();
  }

  function addPrize() {
    set("prizes", [...form.prizes, { name: "", points: 0, winners: 1 }]);
  }

  function setPrize(i, key, value) {
    set("prizes", form.prizes.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }

  function removePrize(i) {
    set("prizes", form.prizes.filter((_, idx) => idx !== i));
  }

  async function onImageFile(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await uploadImage(file, "competitions");
      set("imageUrl", url);
      setCustomBanner(true);
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const typeLabel = TYPES.find((t) => t.id === form.type)?.label || "Quiz";

  return (
    <div className="pf ce-page" key={isNew ? "new" : id}>
      <nav className="crumbs">
        <Link to="/">Dashboard</Link>
        <span>›</span>
        <Link to="/competitions">Competitions</Link>
        <span>›</span>
        <strong>Create / Edit Competition</strong>
      </nav>

      <div className="prod-head">
        <div>
          <h1>
            <span className="prod-title-icon"><Icon name="trophy" size={18} /></span>
            Create / Edit Competition
          </h1>
          <p>Create a new competition or edit an existing one.</p>
        </div>
        <div className="prod-actions">
          <button className="btn btn-ghost btn-small" type="button" onClick={() => setPreview(true)}>
            <Icon name="eye" size={14} /> Preview Competition
          </button>
          <button className="btn btn-ghost btn-small" type="button" disabled={busy} onClick={saveDraft}>
            <Icon name="save" size={14} /> Save as Draft
          </button>
          <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={publish}>
            <Icon name="send" size={14} /> Publish Competition
          </button>
        </div>
      </div>

      <div className="pf-tabs">
        {STEPS.map((s) => (
          <button key={s.id} type="button" className={step === s.id ? "on" : ""} onClick={() => setStep(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {toast && <p className="cust-toast">{toast}</p>}

      <div className={`ce-layout ${step === "basic" ? "three" : ""}`}>
        <section className="card pf-card">
          {step === "basic" && (
            <>
              <label>Competition Title <Req /></label>
              <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Flash Tech Quiz" />

              <div className="pf-2">
                <div>
                  <label>Competition Type <Req /></label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                    {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Category <Req /></label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label>Short Description <Req /></label>
              <textarea
                rows={3}
                maxLength={150}
                value={form.shortDescription}
                onChange={(e) => set("shortDescription", e.target.value)}
                placeholder="Answer tech questions correctly and win amazing rewards!"
              />
              <div className="pf-count">{form.shortDescription.length}/150</div>

              <label>Detailed Description</label>
              <div className={`pf-rich ${editorMax ? "max" : ""}`}>
                <div className="pf-toolbar">
                  <select onChange={(e) => { document.execCommand("formatBlock", false, e.target.value); editorRef.current?.focus(); }}>
                    <option value="p">Style</option>
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading</option>
                  </select>
                  <button type="button" onClick={() => cmd("bold")}><b>B</b></button>
                  <button type="button" onClick={() => cmd("italic")}><i>I</i></button>
                  <button type="button" onClick={() => cmd("underline")}><u>U</u></button>
                  <button type="button" title="List" onClick={() => cmd("insertUnorderedList")}><Icon name="list" size={14} /></button>
                  <button type="button" title="Link" onClick={addLink}><Icon name="link" size={14} /></button>
                  <button type="button" title="Image" onClick={addEditorImage}><Icon name="image" size={14} /></button>
                  <button type="button" title="Maximize" onClick={() => setEditorMax((v) => !v)}>
                    <Icon name="fullscreen" size={14} />
                  </button>
                </div>
                <div
                  key={editorBoot.key}
                  ref={editorRef}
                  className="pf-editor"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Describe how the competition works..."
                  dangerouslySetInnerHTML={{ __html: editorBoot.html }}
                  onInput={(e) => set("description", e.currentTarget.innerText.slice(0, 1000))}
                />
                <div className="pf-editor-foot">{Math.min(form.description.length, 1000)}/1000</div>
              </div>

              <label>Competition Image / Banner</label>
              <div className="ce-banner">
                {customBanner && form.imageUrl ? (
                  <img src={form.imageUrl} alt="" />
                ) : (
                  <div className="ce-banner-art">
                    <span className="ce-ba-orb o1" />
                    <span className="ce-ba-orb o2" />
                    <span className="ce-ba-gift" />
                    <span className="ce-ba-laptop" />
                    <strong>{(form.title || "FLASH TECH QUIZ").toUpperCase()}</strong>
                  </div>
                )}
                {customBanner && form.imageUrl && (
                  <div className="ce-banner-overlay">
                    <strong>{(form.title || "FLASH TECH QUIZ").toUpperCase()}</strong>
                  </div>
                )}
                <button className="btn btn-ghost btn-small ce-banner-btn" type="button" onClick={() => fileRef.current?.click()}>
                  Change Image
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <p className="muted pf-img-help">Recommended: 1200 x 628px, Max size: 2MB (PNG, JPG)</p>
            </>
          )}

          {step === "rules" && (
            <>
              <h2>Rules & Eligibility</h2>
              <label>Who Can Participate <Req /></label>
              <div className="ce-radios">
                <Radio name="who" value="all" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="All Customers" />
                <Radio name="who" value="groups" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="Specific Customer Groups" />
                <Radio name="who" value="membership" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="By Membership Level" />
                <Radio name="who" value="purchase" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="By Purchase History" />
              </div>
              <div className="pf-2">
                <div>
                  <label>Minimum order value (KSh)</label>
                  <input type="number" min="0" value={form.details.minOrderKes || 0} onChange={(e) => setDetail("minOrderKes", Number(e.target.value))} />
                </div>
                <div>
                  <label>Minimum points balance</label>
                  <input type="number" min="0" value={form.details.minPoints || 0} onChange={(e) => setDetail("minPoints", Number(e.target.value))} />
                </div>
              </div>
              <label>Max entries per customer</label>
              <input type="number" min="1" value={form.details.maxEntries || 1} onChange={(e) => setDetail("maxEntries", Number(e.target.value))} />
            </>
          )}

          {step === "actions" && (
            <>
              <h2>Participation & Actions</h2>
              <p className="muted">Choose how customers enter this competition.</p>
              {["quiz", "purchase", "referral", "review", "login"].map((a) => (
                <label key={a} className="pf-check">
                  <input
                    type="checkbox"
                    checked={(form.details.actions || []).includes(a)}
                    onChange={(e) => {
                      const cur = form.details.actions || [];
                      setDetail("actions", e.target.checked ? [...cur, a] : cur.filter((x) => x !== a));
                    }}
                  />
                  <span><strong>{a[0].toUpperCase() + a.slice(1)}</strong></span>
                </label>
              ))}
            </>
          )}

          {step === "prizes" && (
            <>
              <h2>Prizes & Rewards</h2>
              {form.prizes.map((p, i) => (
                <div key={i} className="ce-prize-edit">
                  <label>Prize {i + 1}</label>
                  <input value={p.name} onChange={(e) => setPrize(i, "name", e.target.value)} placeholder="KSh 10,000 Voucher + 5,000 Points" />
                  <div className="pf-2">
                    <div>
                      <label>Points</label>
                      <input type="number" min="0" value={p.points} onChange={(e) => setPrize(i, "points", Number(e.target.value))} />
                    </div>
                    <div>
                      <label>Winners</label>
                      <input type="number" min="1" value={p.winners} onChange={(e) => setPrize(i, "winners", Number(e.target.value))} />
                    </div>
                  </div>
                  {form.prizes.length > 1 && (
                    <button className="link-reset" type="button" onClick={() => removePrize(i)}>Remove</button>
                  )}
                </div>
              ))}
              <button className="link-reset" type="button" onClick={addPrize}>+ Add Another Prize</button>
            </>
          )}

          {step === "display" && (
            <>
              <h2>Display & Promotion</h2>
              <label className="pf-check">
                <input type="checkbox" checked={form.details.featured !== false} onChange={(e) => setDetail("featured", e.target.checked)} />
                <span><strong>Featured competition</strong><small>Highlight in the app</small></span>
              </label>
              <label className="pf-check">
                <input type="checkbox" checked={Boolean(form.details.homepage)} onChange={(e) => setDetail("homepage", e.target.checked)} />
                <span><strong>Show on homepage</strong></span>
              </label>
              <label>Promotion channels</label>
              {["app", "email", "sms"].map((ch) => (
                <label key={ch} className="pf-check">
                  <input
                    type="checkbox"
                    checked={(form.details.channels || []).includes(ch)}
                    onChange={(e) => {
                      const cur = form.details.channels || [];
                      setDetail("channels", e.target.checked ? [...cur, ch] : cur.filter((x) => x !== ch));
                    }}
                  />
                  <span><strong>{ch.toUpperCase()}</strong></span>
                </label>
              ))}
            </>
          )}

          {step === "review" && (
            <>
              <h2>Review & Publish</h2>
              <dl className="pf-summary">
                <div><dt>Title</dt><dd>{form.title || "—"}</dd></div>
                <div><dt>Type</dt><dd>{typeLabel}</dd></div>
                <div><dt>Category</dt><dd>{form.category}</dd></div>
                <div><dt>Start</dt><dd>{form.startsAt ? fmtDay(eatInputToIso(form.startsAt)) : "—"}</dd></div>
                <div><dt>End</dt><dd>{form.endsAt ? fmtDay(eatInputToIso(form.endsAt)) : "—"}</dd></div>
                <div><dt>Visibility</dt><dd>{form.visibility === "public" ? "Public" : form.visibility}</dd></div>
                <div><dt>Prizes</dt><dd>{form.prizes.filter((p) => p.name).length}</dd></div>
              </dl>
              <p className="muted">Publish to make this competition live for eligible customers.</p>
            </>
          )}
        </section>

        {step === "basic" && (
          <section className="card pf-card">
            <div className="pf-2">
              <div>
                <label>Start Date & Time <Req /></label>
                <input type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div>
                <label>End Date & Time <Req /></label>
                <input type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
            </div>
            <label>Time Zone</label>
            <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
              <option value="Africa/Nairobi">East Africa Time (EAT)</option>
              <option value="UTC">UTC</option>
            </select>
            <div className="rule-status-row ce-status">
              <div>
                <div>Status <Req /></div>
                <p className="muted">Active competitions are visible to customers</p>
              </div>
              <Switch on={form.isActive} onClick={() => set("isActive", !form.isActive)} />
              <strong className={form.isActive ? "pts-pos" : ""}>{form.isActive ? "Active" : "Inactive"}</strong>
            </div>
            <label>Visibility</label>
            <div className="ce-radios">
              <Radio name="vis" value="public" current={form.visibility} onChange={(v) => set("visibility", v)} label="Public (Visible to all customers)" />
              <Radio name="vis" value="groups" current={form.visibility} onChange={(v) => set("visibility", v)} label="Specific Customer Groups" />
              <Radio name="vis" value="invitation" current={form.visibility} onChange={(v) => set("visibility", v)} label="By Invitation Only" />
            </div>
            <label>Who Can Participate</label>
            <div className="ce-radios">
              <Radio name="who2" value="all" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="All Customers" />
              <Radio name="who2" value="groups" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="Specific Customer Groups" />
              <Radio name="who2" value="membership" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="By Membership Level" />
              <Radio name="who2" value="purchase" current={form.whoCanParticipate} onChange={(v) => set("whoCanParticipate", v)} label="By Purchase History" />
            </div>
            <label>Created By</label>
            <input value={form.createdBy} readOnly />
          </section>
        )}

        <aside className="ce-side">
          <section className="card pf-card">
            <h2>Prize & Reward Summary</h2>
            <ul className="ce-prize-list">
              {form.prizes.filter((p) => p.name).map((p, i) => (
                <li key={`${p.name}-${i}`}>
                  <span className="ce-prize-ico"><Icon name="gift" size={14} /></span>
                  <span>
                    <strong>{p.name}</strong>
                    <div className="muted">{p.winners} {p.winners === 1 ? "Winner" : "Winners"}</div>
                  </span>
                </li>
              ))}
              {form.prizes.filter((p) => p.name).length === 0 && <li className="muted">No prizes yet.</li>}
            </ul>
            <button className="link-reset" type="button" onClick={() => { addPrize(); setStep("prizes"); }}>+ Add Another Prize</button>
          </section>

          <section className="card pf-card">
            <h2>Competition Settings</h2>
            {[
              ["allowMultipleEntries", "Allow Multiple Entries"],
              ["requireLogin", "Require Login to Participate"],
              ["showLeaderboard", "Show Leaderboard"],
              ["autoSelectWinners", "Auto Select Winners"],
            ].map(([key, label]) => (
              <div key={key} className="ce-set-row">
                <span>{label}</span>
                <span className="ce-set-ctl">
                  <Switch on={form[key]} onClick={() => set(key, !form[key])} />
                  <b className={form[key] ? "pts-pos" : "pts-neg"}>{form[key] ? "Yes" : "No"}</b>
                </span>
              </div>
            ))}
            <label>Winners Announced</label>
            <select value={form.winnersAnnounced} onChange={(e) => set("winnersAnnounced", e.target.value)}>
              <option value="after_end">After competition ends</option>
              <option value="immediately">Immediately</option>
              <option value="scheduled">Scheduled date</option>
            </select>
            <label>Results Visibility</label>
            <select value={form.resultsVisibility} onChange={(e) => set("resultsVisibility", e.target.value)}>
              <option value="public">Public</option>
              <option value="participants">Participants only</option>
              <option value="private">Private</option>
            </select>
            <label>Points Awarded Type</label>
            <select value={form.pointsAwardedType} onChange={(e) => set("pointsAwardedType", e.target.value)}>
              <option value="instant">Instant after win</option>
              <option value="after_end">After competition ends</option>
              <option value="manual">Manual</option>
            </select>
          </section>

          <section className="card pf-card ce-reach">
            <h2>Estimated Reach</h2>
            <div className="prod-stat-n purple">{fmtNum(form.estimatedReach)}</div>
            <div className="cat-stat-hint up">↑ {Number(form.estimatedReachPct || 0).toFixed(1)}% vs last similar competition</div>
          </section>
        </aside>
      </div>

      <div className="ce-bottom">
        <section className="card pf-card">
          <h2>Competition Timeline</h2>
          <ol className="ce-timeline">
            {timeline.map((t, i) => (
              <li key={t.id}>
                <span className={`ce-tl-dot ${i === 0 ? "on" : ""}`}>{i + 1}</span>
                <strong>{t.label}</strong>
                <div className="muted">{fmtDay(t.date)}</div>
              </li>
            ))}
          </ol>
        </section>
        <section className="card pf-card ce-tips">
          <h2>Quick Tips</h2>
          <ul>
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="pf-foot ce-foot">
        <button className="btn btn-ghost btn-small" type="button" onClick={() => navigate("/competitions")}>Cancel</button>
        <button className="btn btn-purple btn-small" type="button" disabled={busy} onClick={saveContinue}>
          {busy ? "Saving…" : "Save & Continue"}
        </button>
      </footer>

      {preview && (
        <div className="prod-modal" onClick={() => setPreview(false)}>
          <div className="card prod-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ord-drawer-head">
              <h2>Preview</h2>
              <button className="icon-btn" type="button" onClick={() => setPreview(false)}><Icon name="x" size={16} /></button>
            </div>
            {form.imageUrl && <img src={form.imageUrl} alt="" className="ce-preview-img" />}
            <h3>{form.title || "Untitled competition"}</h3>
            <p className="muted">{form.shortDescription || form.description}</p>
            <p>{fmtDay(eatInputToIso(form.startsAt))} – {fmtDay(eatInputToIso(form.endsAt))}</p>
            <ul className="ce-prize-list">
              {form.prizes.filter((p) => p.name).map((p, i) => (
                <li key={i}><strong>{p.name}</strong> · {p.winners} {p.winners === 1 ? "winner" : "winners"}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
