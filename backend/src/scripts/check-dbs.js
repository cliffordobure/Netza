require("dotenv").config();
const mongoose = require("mongoose");

async function checkDb(label, uri) {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection("users").countDocuments();
  const products = await mongoose.connection.db.collection("products").countDocuments();
  const customers = await mongoose.connection.db
    .collection("users")
    .countDocuments({ role: "CUSTOMER" });
  console.log(`${label}: users=${users} products=${products} customers=${customers}`);
  await mongoose.disconnect();
}

async function main() {
  const raw = process.env.MONGODB_URI || "";
  const base = raw.includes(".mongodb.net/")
    ? raw.replace(/\.mongodb\.net\/[^?]*/, ".mongodb.net")
    : raw.replace(/(\.mongodb\.net)(\?|$)/, "$1");
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
  await checkDb("test (default)", `${base}/test${q}`);
  await checkDb("tajira", `${base}/tajira${q}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
