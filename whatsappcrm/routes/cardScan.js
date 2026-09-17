const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { parseBusinessCard } = require("../services/geminiVision");
const { getSession, isExists } = require("../helper/socket/function");
const logger = require("../utils/logger");

// ── Upload & Scan Business Card ──────────────────────────────────────────────
router.post("/upload", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    let fileBuffer = null;
    let mimeType = "image/jpeg";
    let fileExt = ".jpg";

    if (req.files && (req.files.card_image || req.files.image)) {
      const cardFile = req.files.card_image || req.files.image;
      fileBuffer = cardFile.data;
      mimeType = cardFile.mimetype || "image/jpeg";
      fileExt = path.extname(cardFile.name) || ".jpg";
    } else if (req.body && (req.body.image || req.body.card_image)) {
      const rawBase64 = req.body.image || req.body.card_image;
      if (typeof rawBase64 === "string") {
        const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          fileBuffer = Buffer.from(match[2], "base64");
          if (mimeType.includes("png")) fileExt = ".png";
          else if (mimeType.includes("webp")) fileExt = ".webp";
        } else {
          fileBuffer = Buffer.from(rawBase64, "base64");
        }
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Please upload a business card image (field name: 'image' or 'card_image')",
      });
    }

    // 1. Save card image to static public folder
    const uploadDir = path.resolve(process.cwd(), "./client/public/media/cards");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `card_${uid}_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    const scan_image_url = `/media/cards/${fileName}`;

    // 2. Parse via Gemini Vision AI
    let parsed;
    try {
      parsed = await parseBusinessCard(fileBuffer, mimeType);
    } catch (aiErr) {
      logger.warn("Gemini Vision OCR fallback:", aiErr.message);
      parsed = {
        name: "Scanned Contact",
        company: "",
        job_title: "",
        mobile: "",
        secondary_phone: "",
        email: "",
        website: "",
        address: "",
        city: "",
        services: [],
        social_links: {},
        tagline: "",
        notes: "Card captured via mobile scanner",
        confidence_score: 60,
      };
    }

    // 3. Optional overrides from client
    const {
      phonebook_id = null,
      phonebook_name = "AI Scanned Leads",
      event_id = null,
      lead_temperature = "warm",
      pipeline_stage = "new",
      lat = null,
      lng = null,
      auto_create_contact = "true",
      send_intro_whatsapp = "false",
      instance_id = null,
      intro_template = null,
    } = req.body;

    let contactId = null;

    if (auto_create_contact === "true" || auto_create_contact === true) {
      const cleanMobile = (parsed.mobile || "").replace(/[^\d+]/g, "").trim();

      const insertResult = await query(
        `INSERT INTO contact (
          uid, phonebook_id, phonebook_name, name, mobile,
          company, job_title, email, website, address, notes,
          source, event_id, lead_temperature, pipeline_stage,
          lat, lng, scan_image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          phonebook_id,
          phonebook_name,
          parsed.name || "Unknown Contact",
          cleanMobile,
          parsed.company || "",
          parsed.job_title || "",
          parsed.email || "",
          parsed.website || "",
          parsed.address || "",
          parsed.notes || "",
          "scanned",
          event_id ? parseInt(event_id, 10) : null,
          lead_temperature || "warm",
          pipeline_stage || "new",
          lat ? parseFloat(lat) : null,
          lng ? parseFloat(lng) : null,
          scan_image_url,
        ]
      );

      contactId = insertResult.insertId;

      // Log activity
      await query(
        `INSERT INTO contact_activity (uid, contact_id, activity_type, description, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uid,
          contactId,
          "CARD_SCANNED",
          `Business card scanned via AI. Name: ${parsed.name || "N/A"}, Company: ${parsed.company || "N/A"}`,
          JSON.stringify(parsed),
        ]
      );

      // Trigger Webhook Dispatcher to CRM Connectors (HubSpot, Salesforce, Zoho, Zapier)
      try {
        const { dispatchWebhookEvent } = require("../services/webhookDispatcher");
        dispatchWebhookEvent(uid, "contact.created", {
          id: contactId,
          name: parsed.name,
          phone: cleanMobile,
          email: parsed.email,
          company: parsed.company,
          job_title: parsed.job_title,
          website: parsed.website,
          notes: parsed.notes,
          lead_temperature: lead_temperature || "warm",
          pipeline_stage: pipeline_stage || "new",
          scan_image_url: scan_image_url,
        }).catch(() => {});
      } catch (_) {}

      // Trigger Multi-Agent Round-Robin Assignment
      try {
        const { assignLeadToNextAgent } = require("../services/roundRobinService");
        assignLeadToNextAgent(uid, contactId).catch(() => {});
      } catch (_) {}

      // 4. Optionally send automatic WhatsApp intro
      if (
        (send_intro_whatsapp === "true" || send_intro_whatsapp === true) &&
        cleanMobile
      ) {
        try {
          const userInstance = instance_id
            ? await query(`SELECT * FROM instance WHERE uid = ? AND uniqueId = ?`, [uid, instance_id])
            : await query(`SELECT * FROM instance WHERE uid = ? AND status = 'ACTIVE' LIMIT 1`, [uid]);

          if (userInstance.length > 0) {
            const session = await getSession(userInstance[0].uniqueId);
            if (session) {
              const formattedMobile = cleanMobile.replace("+", "");
              const receiverJid = `${formattedMobile}@s.whatsapp.net`;
              const exists = await isExists(session, receiverJid, false);

              if (exists) {
                // Get user's digital profile username
                const [prof] = await query(
                  `SELECT username FROM digital_profiles WHERE uid = ?`,
                  [uid]
                );

                const host = req.get("host") || "localhost:3010";
                const protocol = req.protocol || "http";
                const profileLink = prof?.username
                  ? `${protocol}://${host}/p/${prof.username}`
                  : `${protocol}://${host}`;

                const defaultMsg = `Hi ${parsed.name || "there"}, great meeting you! Here are my digital business card details: ${profileLink}\nLooking forward to connecting!`;
                const finalMsg = intro_template
                  ? intro_template.replace("{{name}}", parsed.name || "")
                  : defaultMsg;

                await session.sendMessage(receiverJid, { text: finalMsg });
              }
            }
          }
        } catch (sendErr) {
          logger.warn("Could not auto-send WhatsApp greeting:", sendErr.message);
        }
      }
    }

    // Trigger instant push notification to user's mobile devices
    try {
      const { sendLeadScannedPush } = require("../services/pushService");
      sendLeadScannedPush(uid, { id: contactId, name: parsed.name, company: parsed.company, lead_temperature }).catch(() => {});
    } catch (pushErr) {
      // Non-blocking
    }

    return res.json({
      success: true,
      msg: "Card scanned successfully",
      contactId,
      contact: {
        id: contactId,
        name: parsed.name || "Scanned Contact",
        mobile: (parsed.mobile || "").replace(/[^\d+]/g, "").trim(),
        company: parsed.company || "",
        job_title: parsed.job_title || "",
        email: parsed.email || "",
        website: parsed.website || "",
        address: parsed.address || "",
        notes: parsed.notes || "",
        lead_temperature: lead_temperature || "warm",
        pipeline_stage: pipeline_stage || "new",
        scan_image_url,
      },
      parsed,
      scan_image_url,
    });
  } catch (err) {
    logger.error("Card Scan Upload error:", err);
    return res.status(500).json({
      success: false,
      msg: err.message || "Server error processing card scan",
    });
  }
});

// ── Get Card Scan History ───────────────────────────────────────────────────
router.get("/history", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { limit = 50, offset = 0 } = req.query;

    const cards = await query(
      `SELECT c.*, e.name as event_name
       FROM contact c
       LEFT JOIN events e ON c.event_id = e.id
       WHERE c.uid = ? AND c.source = 'scanned'
       ORDER BY c.createdAt DESC
       LIMIT ? OFFSET ?`,
      [uid, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM contact WHERE uid = ? AND source = 'scanned'`,
      [uid]
    );

    res.json({
      success: true,
      total,
      cards,
    });
  } catch (err) {
    logger.error("Card History error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching card history" });
  }
});

// ── Batch Card Scanning (Scan up to 10 cards simultaneously) ────────────────
router.post("/batch", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    let fileItems = []; // each: { data, name, mimetype }

    if (req.files) {
      let rawFiles = [];
      if (req.files.card_images) {
        rawFiles = Array.isArray(req.files.card_images)
          ? req.files.card_images
          : [req.files.card_images];
      } else {
        rawFiles = Object.values(req.files).filter(
          (f) => f && f.mimetype && f.mimetype.startsWith("image/")
        );
      }
      fileItems = rawFiles.map((f) => ({
        data: f.data,
        name: f.name || "card.jpg",
        mimetype: f.mimetype || "image/jpeg",
      }));
    } else if (req.body && Array.isArray(req.body.images)) {
      fileItems = req.body.images
        .map((rawBase64, idx) => {
          let mimeType = "image/jpeg";
          let ext = ".jpg";
          let buffer = null;
          if (typeof rawBase64 === "string") {
            const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              buffer = Buffer.from(match[2], "base64");
              if (mimeType.includes("png")) ext = ".png";
              else if (mimeType.includes("webp")) ext = ".webp";
            } else {
              buffer = Buffer.from(rawBase64, "base64");
            }
          }
          return {
            data: buffer,
            name: `batch_${idx}${ext}`,
            mimetype: mimeType,
          };
        })
        .filter((item) => item.data && item.data.length > 0);
    }

    if (fileItems.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Please upload image files or base64 array under 'card_images' or 'images'",
      });
    }

    const { event_id = null, lead_temperature = "warm" } = req.body || {};
    const uploadDir = path.resolve(process.cwd(), "./client/public/media/cards");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const results = [];

    for (let i = 0; i < Math.min(fileItems.length, 10); i++) {
      const cardFile = fileItems[i];
      const fileExt = path.extname(cardFile.name) || ".jpg";
      const fileName = `batch_card_${uid}_${Date.now()}_${i}${fileExt}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, cardFile.data);
      const scan_image_url = `/media/cards/${fileName}`;

      try {
        let parsed;
        try {
          parsed = await parseBusinessCard(cardFile.data, cardFile.mimetype || "image/jpeg");
        } catch (aiErr) {
          logger.warn("Batch AI parse fallback for card", i, aiErr.message);
          parsed = {
            name: `Scanned Contact ${i + 1}`,
            company: "",
            job_title: "",
            mobile: "",
            email: "",
            notes: "Scanned via batch mode",
          };
        }
        const cleanMobile = (parsed.mobile || "").replace(/[^\d+]/g, "").trim();

        const insertRes = await query(
          `INSERT INTO contact (
            uid, phonebook_name, name, mobile, company, job_title,
            email, website, address, notes, source, event_id,
            lead_temperature, pipeline_stage, scan_image_url
          ) VALUES (?, 'Batch Scanned Leads', ?, ?, ?, ?, ?, ?, ?, ?, 'scanned', ?, ?, 'new', ?)`,
          [
            uid,
            parsed.name || `Scanned Contact ${i + 1}`,
            cleanMobile,
            parsed.company || "",
            parsed.job_title || "",
            parsed.email || "",
            parsed.website || "",
            parsed.address || "",
            parsed.notes || "",
            event_id ? parseInt(event_id, 10) : null,
            lead_temperature || "warm",
            scan_image_url,
          ]
        );

        results.push({
          success: true,
          contactId: insertRes.insertId,
          parsed,
          contact: {
            id: insertRes.insertId,
            ...parsed,
            lead_temperature: lead_temperature || "warm",
            pipeline_stage: "new",
            scan_image_url,
          },
          scan_image_url,
        });
      } catch (err) {
        results.push({
          success: false,
          fileName: cardFile.name,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      results,
    });
  } catch (err) {
    logger.error("Batch card scan error:", err);
    res.status(500).json({ success: false, msg: "Server error processing batch card scan" });
  }
});

module.exports = router;
