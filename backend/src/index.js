const { createApp } = require("./app");
const config = require("./config");
const { connectDb, disconnectDb } = require("./lib/db");
const { Product, User } = require("./models");
const { seed, seedAdminOnly } = require("./seed");
const { normalizeIdentities } = require("./modules/auth/auth.controller");

async function start() {
  await connectDb();
  if ((await User.countDocuments()) === 0) {
    await seedAdminOnly();
    console.log("Created admin account (no demo users or products).");
  }
  if ((await Product.countDocuments()) === 0 && process.env.SEED_DEMO === "true") {
    await seed();
    console.log("SEED_DEMO=true: loaded demo catalog and sample customers.");
  }
  try {
    const healed = await normalizeIdentities();
    if (healed.updated || healed.skipped) {
      console.log(
        `Identity normalize: ${healed.updated} updated, ${healed.skipped} skipped of ${healed.total}`
      );
    }
  } catch (err) {
    console.warn("Identity normalize skipped:", err.message);
  }
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`NETZA API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await disconnectDb();
  process.exit(0);
});
