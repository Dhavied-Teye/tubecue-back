// index.js
import express, { json } from "express";
import cors from "cors";
import searchRoute from "./routes/searchRoute.js";

const app = express();
app.use(cors());
app.use(json());

app.use("/search", searchRoute);

app.listen(4000, () => {
  console.log("TubeCue backend running on http://localhost:4000");
});
