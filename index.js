// index.js
import express from "express";
import cors from "cors";
import searchRoute from "./routes/searchRoute.js";

const app = express();

// Allow your Chrome Extension (production & local dev)
const allowedOrigins = [
  "chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc",
  null, // Allow 'null' origin for extensions and local files
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
  })
);

app.use(express.json());
app.use("/search", searchRoute);

app.listen(4000, () => {
  console.log("TubeCue backend running on http://localhost:4000");
});
