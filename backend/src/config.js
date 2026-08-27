require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d",
  },
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim()),
  appName: process.env.APP_NAME || "NETZA Kenya",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "netza",
  },
};
