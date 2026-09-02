/**
 * Wipe the live API database via super-admin (after deploy).
 * Usage: node src/scripts/reset-via-api.js
 * Env: API_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 */
require("dotenv").config();

const API = (process.env.API_URL || "https://netza.onrender.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL || "admin@tajira.co.ke";
const PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) throw new Error(login.message || "Login failed");

  const token = login.accessToken;
  const resetRes = await fetch(`${API}/admin/system/reset-database`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirm: "RESET TAJIRA" }),
  });
  const reset = await resetRes.json();
  if (!resetRes.ok) throw new Error(reset.message || JSON.stringify(reset));

  console.log("Remote reset OK:", reset.message);
  console.log("Admin:", reset.admin?.email, reset.admin?.phone);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
