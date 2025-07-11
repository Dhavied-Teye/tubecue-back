import express, { json } from "express";
import cors from "cors";
import fs from "fs";
import { execSync } from "child_process";
import webvtt from "node-webvtt";
import Fuse from "fuse.js";

const app = express();
app.use(cors());
app.use(json());

app.post("/search", async (req, res) => {
  const { videoId, keyword } = req.body;
  console.log("Received request:", { videoId, keyword });

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const captionFile = `${videoId}.en.vtt`;

  try {
    // Download captions only (no audio/video)
    const cmd = `yt-dlp --skip-download --write-auto-sub --sub-lang en --sub-format vtt --output "${videoId}.%(ext)s" ${videoUrl}`;
    execSync(cmd, { stdio: "inherit" });

    let rawVTT = fs.readFileSync(captionFile, "utf8");
    const lines = rawVTT.split("\n");
    const startIndex = lines.findIndex((line) => line.trim() === "") + 1;
    rawVTT = "WEBVTT\n\n" + lines.slice(startIndex).join("\n");

    const parsed = webvtt.parse(rawVTT);
    const transcript = parsed.cues.map((cue) => ({
      text: cue.text,
      start: cue.start,
    }));

    const fuse = new Fuse(transcript, {
      keys: ["text"],
      threshold: 0.35,
      distance: 100,
    });

    const results = fuse.search(keyword);
    const matches = results.map((r) => ({
      text: r.item.text,
      start: Math.max(0, Math.floor(r.item.start - 5)), // start 5s earlier
    }));

    fs.unlinkSync(captionFile);
    if (matches.length > 0) {
      return res.json({ matches, source: "youtube" });
    } else {
      return res.json({ matches: [], source: "youtube" });
    }
  } catch (err) {
    console.error("Search error:", err.message);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    return res.status(500).json({ error: "Search failed." });
  }
});

app.listen(4000, () => {
  console.log("TubeCue backend running on http://localhost:4000");
});
