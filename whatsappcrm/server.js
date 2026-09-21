require("dotenv").config({ silent: true });
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fileUpload = require("express-fileupload");
const nodeCleanup = require("node-cleanup");
const { initCampaign } = require("./loops/campaignBeta.js");
const { init, cleanup } = require("./helper/addon/qr");
const { warmerLoopInit } = require("./helper/addon/qr/warmer/index.js");
const { initTele, cleanupTele } = require("./helper/addon/telegram/tele.js");
const { initQrCampaignLoop } = require("./loops/qrCampaignLoop.js");
const isLogging = process.env.NODE_ENV === "logs";

function updateLangJsonFromEnglish() {
  try {
    // Adjust this if your languages folder is somewhere else
    const langsDir = path.resolve(process.cwd(), "languages");

    const englishPath = path.join(langsDir, "English.json");

    if (!fs.existsSync(englishPath)) {
      console.error("[LANG] English.json not found:", englishPath);
      return;
    }

    const englishJson = JSON.parse(fs.readFileSync(englishPath, "utf8"));

    const files = fs
      .readdirSync(langsDir)
      .filter(
        (file) =>
          file.endsWith(".json") &&
          file !== "English.json" &&
          file !== "default.json",
      );

    if (!files.length) {
      console.log("[LANG] No target language files found.");
      return;
    }

    let totalFilesUpdated = 0;
    let totalKeysAdded = 0;

    for (const file of files) {
      const filePath = path.join(langsDir, file);

      let targetJson;

      try {
        targetJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (err) {
        console.error(`[LANG] Failed to parse ${file}:`, err.message);
        continue;
      }

      const addedKeys = [];

      mergeMissingKeys(targetJson, englishJson, "", addedKeys);

      if (addedKeys.length > 0) {
        fs.writeFileSync(
          filePath,
          JSON.stringify(targetJson, null, 2) + "\n",
          "utf8",
        );

        totalFilesUpdated++;
        totalKeysAdded += addedKeys.length;

        console.log(
          `[LANG] Updated ${file}: added ${addedKeys.length} missing keys`,
        );

        console.log(`[LANG] Added keys in ${file}:`, addedKeys);
      }
    }

    console.log(
      `[LANG] Done. Updated ${totalFilesUpdated} files, added ${totalKeysAdded} keys.`,
    );
  } catch (err) {
    console.error("[LANG] updateLangJsonFromEnglish failed:", err);
  }
}

function mergeMissingKeys(target, source, prefix = "", addedKeys = []) {
  for (const key of Object.keys(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (!(key in target)) {
      target[key] = source[key];
      addedKeys.push(fullKey);
      continue;
    }

    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      mergeMissingKeys(target[key], source[key], fullKey, addedKeys);
    }
  }

  return addedKeys;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const app = express();
const currentDir = process.cwd();

// ─── Parse allowed hostnames from env (protocol & trailing slash agnostic) ───
const defaultProductionHostnames = [
  "msgmagnet.com",
  "www.msgmagnet.com",
  "api.msgmagnet.com",
  "app.msgmagnet.com",
  "localhost",
  "127.0.0.1",
];

const allowedHostnames = [process.env.FRONTENDURI, process.env.BACKURI, ...defaultProductionHostnames]
  .filter(Boolean)
  .flatMap((o) => o.split(","))
  .map((o) => o.trim())
  .filter(Boolean)
  .map((o) => {
    try {
      // Ensure a protocol exists so URL() can parse it correctly
      const withProto = /^https?:\/\//i.test(o) ? o : `https://${o}`;
      return new URL(withProto).hostname.toLowerCase();
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .filter((v, i, a) => a.indexOf(v) === i); // dedupe

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser / server-to-server / mobile native requests (no Origin header)
      if (!origin) return callback(null, true);

      // Support mobile schemes
      if (
        origin.startsWith("capacitor://") ||
        origin.startsWith("ionic://") ||
        origin.startsWith("expo://")
      ) {
        return callback(null, true);
      }

      // Extract hostname — ignores http vs https, trailing slash, and paths
      let incomingHostname;
      try {
        // Handle nginx-corrupted comma-separated origins gracefully
        const firstOrigin = origin.split(",")[0].trim();
        incomingHostname = new URL(firstOrigin).hostname.toLowerCase();
      } catch {
        return callback(new Error("Not allowed by CORS"));
      }

      const isAllowed =
        allowedHostnames.includes(incomingHostname) ||
        incomingHostname.endsWith(".msgmagnet.com");

      if (isAllowed) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "api-key"],
    credentials: true,
  }),
);

app.use(fileUpload());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/user", require("./routes/user"));
app.use("/api/web", require("./routes/web"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/phonebook", require("./routes/phonebook"));
app.use("/api/chat_flow", require("./routes/chatFlow"));
app.use("/api/inbox", require("./routes/inbox"));
app.use("/api/templet", require("./routes/templet"));
app.use("/api/chatbot", require("./routes/chatbot"));
app.use("/api/broadcast", require("./routes/broadcast"));
app.use("/api/v1", require("./routes/apiv2"));
app.use("/api/agent", require("./routes/agent"));
app.use("/api/qr", require("./routes/qr"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/webhook", require("./routes/webhook"));
app.use("/api/wa_call", require("./routes/waCall"));
app.use("/api/telegram", require("./routes/telegram"));
app.use("/api/theme", require("./routes/theme"));
app.use("/api/insta", require("./routes/insta"));
app.use("/api/kaban", require("./routes/kaban"));
app.use("/api/waform", require("./routes/waform"));
app.use("/api/messenger", require("./routes/messenger"));
app.use("/api/qr_campaign", require("./routes/qrCampaign"));
app.use("/api/card_scan", require("./routes/cardScan"));
app.use("/api/profile", require("./routes/digitalProfile"));
app.use("/api/events", require("./routes/events"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/network_map", require("./routes/networkMap"));
app.use("/api/pipeline", require("./routes/pipeline"));
app.use("/api/google_sync", require("./routes/googleSync"));
app.use("/api/email_marketing", require("./routes/emailMarketing"));
app.use("/api/ai_suggestions", require("./routes/aiSuggestions"));
app.use("/api/shared_card", require("./routes/sharedCard"));
app.use("/api/referrals", require("./routes/referrals"));
app.use("/api/fair_usage", require("./routes/fairUsage"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/wallet", require("./routes/walletPass"));
app.use("/api/agents", require("./routes/teamAgents"));
app.use("/api/meeting", require("./routes/meetingSummarizer"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/signature", require("./routes/emailSignature"));
app.use("/api/reviver", require("./routes/reviverSequences"));
app.use("/api/community", require("./routes/community"));

// ─── Public Digital Business Profile Web Route (/p/:username) ─────────────────
app.get("/p/:username", (req, res, next) => {
  req.url = `/html/${req.params.username}`;
  return require("./routes/digitalProfile")(req, res, next);
});

// ─── Public Viral Shared Card Exchange Route (/s/:token) ──────────────────────
app.get("/s/:token", (req, res, next) => {
  req.url = `/html/${req.params.token}`;
  return require("./routes/sharedCard")(req, res, next);
});

// ─── Media Streaming Middleware ───────────────────────────────────────────────
const createMediaMiddleware = (folderPath) => {
  const mimeTypes = {
    // Video
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    // Audio
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
  };

  return express.static(path.resolve(currentDir, folderPath), {
    setHeaders: (res, filePath) => {
      res.setHeader("Accept-Ranges", "bytes");

      const ext = path.extname(filePath).toLowerCase();
      if (mimeTypes[ext]) {
        res.setHeader("Content-Type", mimeTypes[ext]);
      }

      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range");
    },
    index: false,
    acceptRanges: true,
  });
};

app.use("/media", createMediaMiddleware("./client/public/media"));
app.use("/meta-media", createMediaMiddleware("./client/public/meta-media"));

// ─── Static & Catch-All ───────────────────────────────────────────────────────
app.use(express.static(path.resolve(currentDir, "./client/public")));

// ─── Next-Gen AI Networking & Smart CRM Portal ────────────────────────────────
app.get("/networking", function (req, res) {
  res.sendFile(path.resolve(currentDir, "./client/public/networking.html"));
});

app.get("*", function (request, response) {
  response.sendFile(path.resolve(currentDir, "./client/public", "index.html"));
});

// ─── Server ───────────────────────────────────────────────────────────────────
const server = app.listen(process.env.PORT || 3010, () => {
  isLogging &&
    console.log(`MsgMagnet server is running on port ${process.env.PORT}`);

  updateLangJsonFromEnglish();
  init();
  setTimeout(() => {
    warmerLoopInit();
    initCampaign();
    initTele();
    initQrCampaignLoop();
    try {
      const { initLeadScoringCron } = require("./services/leadScoring");
      initLeadScoringCron();
    } catch (e) {
      console.error("Lead scoring init error:", e.message);
    }
    try {
      const { initReviverCron } = require("./services/ghostingReviverService");
      initReviverCron();
    } catch (e) {
      console.error("Reviver cron init error:", e.message);
    }
    try {
      const { seedCommunityData } = require("./services/communityService");
      seedCommunityData();
    } catch (e) {
      console.error("Community seed error:", e.message);
    }
  }, 1000);
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = require("./socket").initializeSocket(server);
module.exports = io;

// ─── Cleanup ──────────────────────────────────────────────────────────────────
nodeCleanup(async (exitCode, signal) => {
  await cleanupTele();
  cleanup();
});
