import express from "express";
import fs from "fs";
import { exec, execSync } from "child_process";
import webvtt from "node-webvtt";
import Fuse from "fuse.js";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);
const router = express.Router();

router.post("/", async (req, res) => {
  const { videoId, keyword } = req.body;
  console.log("🔍 Received request:", { videoId, keyword });

  const TEMP_AUDIO = "/tmp/temp_audio.mp3";
  const OUTPUT_DIR = "/tmp/whisper_output";
  const WHISPER_JSON = `${OUTPUT_DIR}/vocals.json`;
  const captionFile = `/tmp/${videoId}.en.vtt`;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cookieFile = "/tmp/youtube_cookies.txt";
  const userAgent = `"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"`;
  const referer = `"https://www.youtube.com"`;

  try {
    // === Try captions first ===
    console.log("📥 Attempting to download captions with yt-dlp...");
    const cmd = `yt-dlp \
  --no-warnings \
  --skip-download \
  --write-sub \
  --write-auto-sub \
  --sub-lang en \
  --sub-format vtt \
  --output "/tmp/${videoId}.%(ext)s" \
  --cookies "${cookieFile}" \
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

    fs.unlinkSync(captionFile);
    console.log("🧹 Cleaned up caption file.");

    if (matches.length > 0) {
      console.log("✅ Matches found in YouTube captions.");
      return res.json({ matches, source: "youtube" });
    }

    // === Whisper fallback ===
    console.log("🌀 No matches in captions. Falling back to Whisper...");

    execSync(
      `yt-dlp -x --audio-format mp3 --downloader ffmpeg --postprocessor-args "-ss 00:00:00 -t 180" -o ${TEMP_AUDIO} --cookies "${cookieFile}" --user-agent ${userAgent} --referer ${referer} ${videoUrl}`,
      { stdio: "inherit" }
    );

    execSync(`demucs ${TEMP_AUDIO}`, { stdio: "inherit" });

    const vocalsPath = `/tmp/separated/htdemucs/${path.basename(
      TEMP_AUDIO,
      ".mp3"
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
    fs.rmSync("/tmp/separated", { recursive: true, force: true });
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

    console.log("✅ Whisper matches found.");
    return res.json({ matches: whisperMatches, source: "whisper" });
  } catch (err) {
    console.error("❌ Search error:", err.message);
    console.error("❌ Full error stack:\n", err.stack);
    if (fs.existsSync(captionFile)) fs.unlinkSync(captionFile);
    return res.status(500).json({ error: "Search failed." });
  }
});

export default router;
