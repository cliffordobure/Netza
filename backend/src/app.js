const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { notFound, errorHandler } = require("./middleware/error");
const { ensureUploadRoot, UPLOAD_ROOT } = require("./lib/localUpload");
const authRoutes = require("./modules/auth/auth.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const orderRoutes = require("./modules/orders/orders.routes");
const { router: paymentRoutes } = require("./modules/payments/payments.routes");
const pointsRoutes = require("./modules/points/points.routes");
const flashRoutes = require("./modules/flashDrops/flashDrops.routes");
const addressRoutes = require("./modules/addresses/addresses.routes");
const reviewRoutes = require("./modules/reviews/reviews.routes");
const quoteRoutes = require("./modules/quotes/quotes.routes");
const bannerRoutes = require("./modules/banners/banners.routes");
const competitionRoutes = require("./modules/competitions/competitions.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const shippingRoutes = require("./modules/shipping/shipping.routes");
const { auth } = require("./middleware/auth");
const liveMonitor = require("./lib/live-monitor");

function createApp() {
  ensureUploadRoot();
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (config.corsOrigins.includes(origin) || config.env !== "production") {
          return cb(null, true);
        }
        return cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(morgan(config.env === "production" ? "combined" : "dev"));
  app.use((req, _res, next) => {
    liveMonitor.recordRequest(req);
    next();
  });
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 400,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => /\/presence\/heartbeat|\/admin\/live/.test(req.originalUrl || ""),
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "tajira-api", time: new Date().toISOString() });
  });

  app.use("/uploads", express.static(UPLOAD_ROOT));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1", catalogRoutes);
  app.use("/api/v1/cart", cartRoutes);
  app.use("/api/v1/orders", orderRoutes);
  app.use("/api/v1/payments", paymentRoutes);
  app.use("/api/v1/points", pointsRoutes);
  app.use("/api/v1/flash-drops", flashRoutes);
  app.use("/api/v1/addresses", addressRoutes);
  app.use("/api/v1/shipping", shippingRoutes);
  app.use("/api/v1/products", reviewRoutes);
  app.use("/api/v1/quotes", quoteRoutes);
  app.use("/api/v1/banners", bannerRoutes);
  app.use("/api/v1/competitions", competitionRoutes);
  app.post(
    "/api/v1/presence/heartbeat",
    auth(false),
    (req, res) => {
      const u = req.user;
      const body = req.body || {};
      const guestId = String(body.sessionId || req.ip || "guest").slice(0, 64);
      const name = u
        ? `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.phone || u.email || "Customer"
        : "Guest";
      liveMonitor.heartbeat({
        sessionId: u ? `u:${u.id}` : `g:${guestId}`,
        userId: u ? String(u.id) : null,
        name,
        role: u?.role || "CUSTOMER",
        path: body.path || "/",
        client: body.client === "dashboard" ? "dashboard" : "mobile",
      });
      res.json({ ok: true });
    }
  );
  app.use("/api/v1/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
