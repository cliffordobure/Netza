const { connectDb, disconnectDb } = require("../src/lib/db");
const { normalizeIdentities } = require("../src/modules/auth/auth.controller");
const { User } = require("../src/models");

async function main() {
  await connectDb();
  const r = await normalizeIdentities();
  console.log("heal", r);

  const emails = await User.aggregate([
    { $match: { email: { $exists: true, $nin: [null, ""] } } },
    {
      $group: {
        _id: { $toLower: "$email" },
        n: { $sum: 1 },
        phones: { $push: "$phone" },
        ids: { $push: "$_id" },
      },
    },
    { $match: { n: { $gt: 1 } } },
  ]);
  console.log("duplicate emails:", emails.length ? emails : "none");

  const sample = await User.find({ role: "CUSTOMER" })
    .sort({ createdAt: -1 })
    .limit(8)
    .select("email phone createdAt firstName");
  console.log(
    "recent customers:",
    sample.map((u) => ({
      name: `${u.firstName}`,
      email: u.email,
      phone: u.phone,
      at: u.createdAt,
    }))
  );

  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
