// index.js
import express from "express";
import cors from "cors";
import searchRoute from "./routes/searchRoute.js";

const app = express();

// Allow only your Chrome Extension
const allowedOrigins = ["chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(express.json());
app.use("/search", searchRoute);

app.listen(4000, () => {
  console.log("TubeCue backend running on http://localhost:4000");
});
