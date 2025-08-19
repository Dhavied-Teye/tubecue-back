import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import searchRoute from "./routes/searchRoute.js";

const app = express();

// Debug: check what we actually imported
console.log("📦 searchRoute import:", searchRoute);

// Allowed origins (extension, dev, prod)
const allowedOrigins = [
  "chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc", // Your actual extension ID
  "http://localhost:5173", // Local frontend for development
  "https://tubecue.fly.dev", // ✅ Your actual deployed backend domain
];

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests from extensions, local dev, or same-origin requests (null)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
console.log("🛠 Mounting /api/captions route...");
app.use("/api/captions", searchRoute);

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TubeCue backend running on port ${PORT}`);
});
