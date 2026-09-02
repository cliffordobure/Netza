require("dotenv").config();
const pesapal = require("../lib/pesapal");
const config = require("../config");

async function main() {
  if (!pesapal.configured()) {
    console.error("Missing PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET.");
    console.error("Get live keys from https://www.pesapal.com (Merchant Dashboard → API Keys).");
    process.exit(1);
  }

  const publicBase = config.publicBaseUrl;
  console.log(`Pesapal environment: ${config.pesapal.env}`);
  console.log(`API host: ${config.pesapal.env === "live" ? "https://pay.pesapal.com/v3" : "sandbox"}`);
  console.log(`PUBLIC_BASE_URL: ${publicBase || "(empty)"}`);

  const token = await pesapal.getToken();
  console.log("Authenticated with Pesapal.");

  const ipns = await pesapal.listIpns(token);
  if (ipns.length) {
    console.log(`Existing IPNs (${ipns.length}):`);
    for (const row of ipns) {
      console.log(`  ${row.ipn_id || row.ipnId}  ${row.url}  ${row.ipn_status_decription || row.ipn_status || ""}`);
    }
  }

  if (!publicBase) {
    console.error("Set PUBLIC_BASE_URL to the deployed API, e.g. https://netza.onrender.com");
    process.exit(1);
  }

  const ipnId = await pesapal.ensureIpnId(token, publicBase);
  console.log(`\nUse this in backend/.env and on Render:\nPESAPAL_IPN_ID=${ipnId}`);
  console.log("IPN URL:", `${publicBase.replace(/\/+$/, "")}/api/v1/payments/pesapal/ipn`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
