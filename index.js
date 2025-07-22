import express from "express";
import cors from "cors";
import searchRoute from "./routes/searchRoute.js";

const app = express();

const allowedOrigins = [
  "chrome-extension://ldplaanbcpnejhhodaiklcomhmmcggnc",
  null, // for local extension
  undefined, // for curl / Postman
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
