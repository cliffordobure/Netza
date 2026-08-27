const { createApp } = require("./app");
const config = require("./config");
const { connectDb, disconnectDb } = require("./lib/db");
const { Product } = require("./models");
const { seed, seedCompetitions } = require("./seed");
const { normalizeIdentities } = require("./modules/auth/auth.controller");

async function start() {
  await connectDb();
  if ((await Product.countDocuments()) === 0) {
    await seed();
  } else {
    const { Competition } = require("./models");
    if ((await Competition.countDocuments()) === 0) await seedCompetitions();
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
