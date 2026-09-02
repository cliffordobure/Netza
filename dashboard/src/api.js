const API = import.meta.env.VITE_API_URL || "https://netza.onrender.com/api/v1";

export function getTokens() {
  return {
    access: localStorage.getItem("tajira_access"),
    refresh: localStorage.getItem("tajira_refresh"),
  };
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("tajira_access", access);
  if (refresh) localStorage.setItem("tajira_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("tajira_access");
  localStorage.removeItem("tajira_refresh");
  localStorage.removeItem("tajira_user");
}

async function refreshAccess() {
  const { refresh } = getTokens();
  if (!refresh) return null;
  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const { access } = getTokens();
  if (access) headers.Authorization = `Bearer ${access}`;
  let res = await fetch(`${API}${path}`, { cache: "no-store", ...options, headers });
  if (res.status === 401 && access) {
    const next = await refreshAccess();
    if (next) {
      headers.Authorization = `Bearer ${next}`;
      res = await fetch(`${API}${path}`, { cache: "no-store", ...options, headers });
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !String(path).startsWith("/auth/")) {
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Upload an image file to Cloudinary via the admin API. Returns `{ url, publicId, ... }`. */
export async function uploadImage(file, folder = "misc") {
  if (!file) throw new Error("No image file provided");

  function buildBody() {
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);
    return body;
  }

  const headers = {};
  const { access } = getTokens();
  if (access) headers.Authorization = `Bearer ${access}`;

  let res = await fetch(`${API}/admin/uploads`, { method: "POST", headers, body: buildBody(), cache: "no-store" });
  if (res.status === 401 && access) {
    const next = await refreshAccess();
    if (next) {
      headers.Authorization = `Bearer ${next}`;
      res = await fetch(`${API}/admin/uploads`, { method: "POST", headers, body: buildBody(), cache: "no-store" });
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      clearTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    const err = new Error(data.message || "Image upload failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const kes = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n || 0);

export function mediaUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  const base = API.replace(/\/api\/v1\/?$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}
