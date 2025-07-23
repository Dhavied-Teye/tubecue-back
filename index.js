import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import searchRoute from "./routes/searchRoute.js";

const app = express();

// Your deployed frontend origin + extension ID
const allowedOrigins = [
  "chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc", // Extension
  "http://localhost:5173", // For local testing if needed
  "https://your-deployed-domain.com", // Add if using deployed frontend
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
    credentials: true, // 🔐 Allow cookies to be sent
  })
);

// Parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/captions", searchRoute);

// Server
app.listen(4000, () => {
  console.log("TubeCue backend running on http://localhost:4000");
});
