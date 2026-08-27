const { createApp } = require("./app");
const config = require("./config");
const { connectDb, disconnectDb } = require("./lib/db");
const { Product } = require("./models");
const { seed, seedCompetitions } = require("./seed");

async function start() {
  await connectDb();
  if ((await Product.countDocuments()) === 0) {
    await seed();
  } else {
    const { Competition } = require("./models");
    if ((await Competition.countDocuments()) === 0) await seedCompetitions();
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
