import express from "express";
import fs from "fs";
import { exec } from "child_process";
import webvtt from "node-webvtt";
import Fuse from "fuse.js";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);
const router = express.Router();

router.post("/", async (req, res) => {
  const { videoId, keyword, cookies } = req.body;
  console.log("🔍 Received request:", {
    videoId,
    keyword,
    hasCookies: !!cookies,
  });

  const captionFile = `/tmp/${videoId}.en.vtt`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // === Try captions first ===
    console.log("📥 Attempting to download captions with yt-dlp...");

    // if popup provided cookies, write them to tmp file
    let cookieArg = "";
    if (cookies) {
      const cookiePath = `/tmp/${videoId}_cookies.txt`;
      fs.writeFileSync(cookiePath, cookies);
      cookieArg = `--cookies "${cookiePath}"`;
    }

    const cmd = `yt-dlp \
      --no-warnings \
      --skip-download \
      --write-sub \
      --write-auto-sub \
      --sub-lang en \
      --sub-format vtt \
      --output "/tmp/${videoId}.%(ext)s" \
      ${cookieArg} \
      --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
      --referer "https://www.youtube.com" \
      --no-playlist \
      "${videoUrl}"`;

    const { stdout, stderr } = await execPromise(cmd);
    console.log("YT-DLP STDOUT:\n", stdout);
    if (stderr) console.error("YT-DLP STDERR:\n", stderr);

    if (!fs.existsSync(captionFile)) {
      console.error("❌ Caption file missing after yt-dlp:", captionFile);
      throw new Error(
        "Caption file not found. Possibly no captions available."
      );
    }

    console.log("📄 Reading caption file:", captionFile);
    let rawVTT = fs.readFileSync(captionFile, "utf8");
    const lines = rawVTT.split("\n");
    const startIndex = lines.findIndex((line) => line.trim() === "") + 1;
    rawVTT = "WEBVTT\n\n" + lines.slice(startIndex).join("\n");

    console.log("🧠 Parsing VTT...");
    const parsed = webvtt.parse(rawVTT);
    const transcript = parsed.cues.map((cue) => ({
      text: cue.text,
      start: cue.start,
    }));

    console.log("🔎 Running fuzzy search on captions...");
    const fuse = new Fuse(transcript, {
      keys: ["text"],
      threshold: 0.35,
      distance: 100,
    });

    const results = fuse.search(keyword);
    const matches = results.map((r) => ({
      text: r.item.text,
      start: Math.max(0, Math.floor(r.item.start - 5)),
    }));

    // cleanup
    fs.unlinkSync(captionFile);
    if (cookies) {
      fs.unlinkSync(`/tmp/${videoId}_cookies.txt`);
    }

    if (matches.length > 0) {
      console.log("✅ Matches found in YouTube captions.");
      return res.json({ matches, source: "youtube" });
    }

    // === Whisper fallback disabled ===
    console.log(
      "⚠️ No matches found in captions, skipping Whisper (disabled)."
    );
    return res.json({ matches: [], source: "youtube" });
  } catch (err) {
    console.error("❌ Search error:", err.message);
    console.error("❌ Full error stack:\n", err.stack);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    return res
      .status(500)
      .json({ error: "Search failed.", details: err.message });
  }
});

export default router;
