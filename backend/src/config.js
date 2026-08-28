require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "7d",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d",
  },
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,https://netza.vercel.app")
    .split(",")
    .map((s) => s.trim()),
  appName: process.env.APP_NAME || "NETZA Kenya",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "netza",
  },
  pesapal: {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || "",
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "",
    env: (process.env.PESAPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox",
    ipnId: process.env.PESAPAL_IPN_ID || "",
  },
};
