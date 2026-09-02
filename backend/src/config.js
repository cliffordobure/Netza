require("dotenv").config();
const { parsePhoneList } = require("./lib/phone");

module.exports = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "7d",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d",
  },
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,https://tajira.vercel.app")
    .split(",")
    .map((s) => s.trim()),
  appName: process.env.APP_NAME || "Tajira Kenya",
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "tajira",
  },
  pesapal: {
    consumerKey: process.env.PESAPAL_CONSUMER_KEY || "",
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || "",
    env: (process.env.PESAPAL_ENV || "sandbox").toLowerCase() === "live" ? "live" : "sandbox",
    ipnId: process.env.PESAPAL_IPN_ID || "",
  },
  beem: {
    apiKey: process.env.BEEM_API_KEY || "",
    secretKey: process.env.BEEM_SECRET_KEY || "",
    senderId: (process.env.BEEM_SENDER_ID || "TAJIRA").slice(0, 11),
    sendUrl: process.env.BEEM_SMS_URL || "https://apisms.beem.africa/v1/send",
    adminPhones: parsePhoneList(process.env.SMS_ADMIN_PHONES || ""),
    salesPhones: parsePhoneList(process.env.SMS_SALES_PHONES || ""),
    supportPhone: process.env.SMS_SUPPORT_PHONE || process.env.STORE_PHONE || "",
  },
};
