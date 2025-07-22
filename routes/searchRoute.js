// routes/searchRoute.js
import express from "express";
import fs from "fs";
import { execSync } from "child_process";
import webvtt from "node-webvtt";
import Fuse from "fuse.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { videoId, keyword } = req.body;
  console.log("🔍 Received request:", { videoId, keyword });

  const TEMP_AUDIO = "temp_audio.mp3";
  const OUTPUT_DIR = "whisper_output";
  const WHISPER_JSON = `${OUTPUT_DIR}/vocals.json`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const captionFile = `${videoId}.en.vtt`;

  try {
    console.log("📥 Attempting to download captions with yt-dlp...");
    const cmd = `yt-dlp --skip-download --write-sub --write-auto-sub --sub-lang en --sub-format vtt --output "${videoId}.%(ext)s" --no-playlist ${videoUrl}`;
    execSync(cmd, { stdio: "inherit" });

    if (!fs.existsSync(captionFile)) {
      throw new Error(`❌ Caption file not found: ${captionFile}`);
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

    fs.unlinkSync(captionFile);
    console.log("🧹 Cleaned up caption file.");

    if (matches.length > 0) {
      console.log("✅ Matches found in YouTube captions.");
      return res.json({ matches, source: "youtube" });
    }

    // === Whisper fallback ===
    console.log("🌀 No matches in captions. Falling back to Whisper...");

    execSync(
      `yt-dlp -x --audio-format mp3 --downloader ffmpeg --postprocessor-args "-ss 00:00:00 -t 180" -o ${TEMP_AUDIO} ${videoUrl}`,
      { stdio: "inherit" }
    );

    execSync(`demucs ${TEMP_AUDIO}`, { stdio: "inherit" });

    const vocalsPath = `separated/htdemucs/${TEMP_AUDIO.replace(
      ".mp3",
      ""
    )}/vocals.wav`;
    execSync(
      `whisper "${vocalsPath}" --model tiny --output_format json --output_dir ${OUTPUT_DIR}`,
      { stdio: "inherit" }
    );

    console.log("🗂 Reading Whisper JSON output...");
    const whisperData = JSON.parse(fs.readFileSync(WHISPER_JSON, "utf8"));
    const whisperMatches = whisperData.segments
      .filter((segment) =>
        segment.text.toLowerCase().includes(keyword.toLowerCase())
      )
      .map((segment) => ({
        text: segment.text,
        start: Math.max(0, Math.floor(segment.start - 5)),
      }));

    // Cleanup
    fs.unlinkSync(TEMP_AUDIO);
    fs.rmSync("separated", { recursive: true, force: true });
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

    console.log("✅ Whisper matches found.");
    return res.json({ matches: whisperMatches, source: "whisper" });
  } catch (err) {
    console.error("❌ Search error:", err.message);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    return res.status(500).json({ error: "Search failed." });
  }
});

export default router;
