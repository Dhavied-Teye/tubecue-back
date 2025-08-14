import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import searchRoute from "./routes/searchRoute.js";

const app = express();

const allowedOrigins = [
  "chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc",
  "http://localhost:5173",
  "https://your-deployed-domain.com",
  null,
  undefined,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/captions", searchRoute);
console.log("🛠 Mounting /api/captions route...");

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TubeCue backend running on port ${PORT}`);
});
