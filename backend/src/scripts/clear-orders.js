/**
 * Delete all orders and order-related demo data. Keeps users, products, categories.
 * Run: node src/scripts/clear-orders.js
 */
require("dotenv").config();
const { connectDb, disconnectDb } = require("../lib/db");
const { Order, PointsTransaction, Review } = require("../models");

async function clearOrders() {
  const [orders, points, reviews] = await Promise.all([
    Order.deleteMany({}),
    PointsTransaction.deleteMany({}),
    Review.deleteMany({}),
  ]);
  console.log(`Removed ${orders.deletedCount} orders, ${points.deletedCount} point records, ${reviews.deletedCount} reviews.`);
}

if (require.main === module) {
  connectDb()
    .then(clearOrders)
    .then(disconnectDb)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { clearOrders };
