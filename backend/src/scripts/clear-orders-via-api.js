require("dotenv").config();

const API = (process.env.API_URL || "https://netza.onrender.com/api/v1").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL || "admin@netza.co.ke";
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
  const before = await fetch(`${API}/admin/orders?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const resetRes = await fetch(`${API}/admin/system/clear-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirm: "CLEAR ORDERS" }),
  });
  const reset = await resetRes.json();
  if (!resetRes.ok) throw new Error(reset.message || JSON.stringify(reset));

  console.log("Before:", before.stats || before);
  console.log("Cleared:", reset);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
