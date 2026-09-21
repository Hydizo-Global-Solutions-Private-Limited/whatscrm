const router = require("express").Router();
const { query } = require("../database/dbpromise.js");
const randomstring = require("randomstring");
const bcrypt = require("bcrypt");
const {
  getUserPlayDays,
  sendAPIMessage,
  getNumberOfDaysFromTimestamp,
  sendMetatemplet,
} = require("../functions/function.js");
const jwt = require("jsonwebtoken");
const { getMetaTempletByName } = require("../loops/loopFunctions.js");
const logger = require("../utils/logger.js");
const { parseBusinessCard } = require("../services/geminiVision.js");
const path = require("path");
const fs = require("fs");

// ─── Universal API Authentication Middleware ─────────────────────────────────
async function authenticateApi(req, res, next) {
  try {
    // 1. Extract token/key from headers, query, or body
    let rawToken =
      req.headers["x-api-key"] ||
      req.headers["api-key"] ||
      req.headers["authorization"] ||
      req.query.token ||
      req.query.api_key ||
      req.body.token ||
      req.body.api_key;

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "API authentication credentials missing. Provide 'x-api-key' or 'Authorization: Bearer <token>' header.",
      });
    }

    if (typeof rawToken === "string" && rawToken.startsWith("Bearer ")) {
      rawToken = rawToken.slice(7).trim();
    }

    // 2. First check if it is an API Key in DB
    let userRow = await query(`SELECT * FROM user WHERE api_key = ?`, [rawToken]);

    // 3. If not an API key directly, check if it is a signed JWT
    if (userRow.length === 0) {
      try {
        const decoded = jwt.verify(rawToken, process.env.JWTKEY || "fallback_jwt_key");
        if (decoded && decoded.uid) {
          userRow = await query(`SELECT * FROM user WHERE uid = ?`, [decoded.uid]);
        }
      } catch (jwtErr) {
        // Token was neither valid DB API key nor valid JWT
      }
    }

    if (!userRow || userRow.length === 0) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Invalid or expired API credentials.",
      });
    }

    const user = userRow[0];

    // 4. Verify subscription plan active status
    if (user.plan && user.plan_expire) {
      const remainingDays = getNumberOfDaysFromTimestamp(user.plan_expire);
      if (remainingDays < 0) {
        return res.status(403).json({
          success: false,
          error: "PLAN_EXPIRED",
          message: "Subscription plan has expired. Please renew in your billing portal.",
        });
      }
    }

    req.user = user;
    req.uid = user.uid;
    next();
  } catch (err) {
    logger.error("authenticateApi error:", err);
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Internal authentication error.",
    });
  }
}

// ─── Health & Metadata Check ──────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "MsgMagnet & WhatsCRM API Gateway",
    version: "5.9.8",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    endpoints: {
      documentation: "/api/v1/docs",
      openapi_spec: "/api/v1/openapi.json",
      contacts: "/api/v1/contacts",
      pipeline: "/api/v1/pipeline",
      card_scan: "/api/v1/card-scan",
      messaging: "/api/v1/send-message",
      templates: "/api/v1/templates",
    },
  });
});

// ─── Current User Profile (/me) ──────────────────────────────────────────────
router.get("/me", authenticateApi, async (req, res) => {
  try {
    const user = req.user;
    let planParsed = null;
    try {
      planParsed = user.plan ? JSON.parse(user.plan) : null;
    } catch (e) {}

    res.json({
      success: true,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
        plan: planParsed,
        plan_expire: user.plan_expire,
        api_key_enabled: true,
        created_at: user.createdAt,
      },
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});

// ─── CONTACTS & LEADS REST API ────────────────────────────────────────────────

// GET /api/v1/contacts - List contacts with search, pagination, and filter
router.get("/contacts", authenticateApi, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { search, phonebook_id, pipeline_stage, lead_temperature } = req.query;

    let sql = `SELECT * FROM contact WHERE uid = ?`;
    const params = [req.uid];

    if (phonebook_id) {
      sql += ` AND phonebook_id = ?`;
      params.push(phonebook_id);
    }
    if (pipeline_stage) {
      sql += ` AND pipeline_stage = ?`;
      params.push(pipeline_stage);
    }
    if (lead_temperature) {
      sql += ` AND lead_temperature = ?`;
      params.push(lead_temperature);
    }
    if (search) {
      sql += ` AND (name LIKE ? OR mobile LIKE ? OR company LIKE ? OR email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    // Get total count
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countResult] = await query(countSql, params);
    const total = countResult ? countResult.total : 0;

    // Get paginated data
    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const contacts = await query(sql, params);

    res.json({
      success: true,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        phonebook_id: c.phonebook_id,
        pipeline_stage: c.pipeline_stage || "new_scanned",
        lead_temperature: c.lead_temperature || "warm",
        email: c.email || c.var1 || "",
        company: c.company || c.var2 || "",
        job_title: c.job_title || c.var3 || "",
        address: c.address || c.var4 || "",
        website: c.website || c.var5 || "",
        notes: c.notes || c.var6 || "",
        source: c.source || "api",
        created_at: c.createdAt || c.created_at,
      })),
    });
  } catch (err) {
    logger.error("Error fetching contacts:", err);
    res.status(500).json({ success: false, message: "Error fetching contacts" });
  }
});

// POST /api/v1/contacts - Create a new lead or contact
router.post("/contacts", authenticateApi, async (req, res) => {
  try {
    const {
      name,
      mobile,
      phonebook_id,
      email,
      company,
      job_title,
      address,
      website,
      notes,
      source,
      pipeline_stage,
      lead_temperature,
    } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "'mobile' phone number is required.",
      });
    }

    // Clean phone number (strip spaces, dashes, parentheses)
    const cleanMobile = mobile.replace(/[^0-9]/g, "");

    // Resolve or create default phonebook if not specified
    let targetPhonebookId = phonebook_id;
    if (!targetPhonebookId) {
      const defaultPb = await query(
        `SELECT id FROM phonebook WHERE uid = ? ORDER BY id ASC LIMIT 1`,
        [req.uid]
      );
      if (defaultPb.length > 0) {
        targetPhonebookId = defaultPb[0].id;
      } else {
        const createPb = await query(
          `INSERT INTO phonebook (name, uid) VALUES (?, ?)`,
          ["General Contacts", req.uid]
        );
        targetPhonebookId = createPb.insertId;
      }
    }

    // Check duplicate
    const existing = await query(
      `SELECT id FROM contact WHERE uid = ? AND mobile = ?`,
      [req.uid, cleanMobile]
    );

    if (existing.length > 0) {
      // Update existing contact
      await query(
        `UPDATE contact SET 
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          company = COALESCE(?, company),
          job_title = COALESCE(?, job_title),
          address = COALESCE(?, address),
          website = COALESCE(?, website),
          notes = COALESCE(?, notes),
          pipeline_stage = COALESCE(?, pipeline_stage),
          lead_temperature = COALESCE(?, lead_temperature)
        WHERE id = ? AND uid = ?`,
        [
          name || null,
          email || null,
          company || null,
          job_title || null,
          address || null,
          website || null,
          notes || null,
          pipeline_stage || null,
          lead_temperature || null,
          existing[0].id,
          req.uid,
        ]
      );

      return res.json({
        success: true,
        contact_id: existing[0].id,
        is_new: false,
        message: "Existing contact updated with new information.",
      });
    }

    // Insert new contact
    const insertResult = await query(
      `INSERT INTO contact (
        uid, phonebook_id, name, mobile, email, company, job_title, address, website, notes, source, pipeline_stage, lead_temperature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.uid,
        targetPhonebookId,
        name || "New Lead",
        cleanMobile,
        email || "",
        company || "",
        job_title || "",
        address || "",
        website || "",
        notes || "",
        source || "api",
        pipeline_stage || "new_scanned",
        lead_temperature || "warm",
      ]
    );

    res.status(201).json({
      success: true,
      contact_id: insertResult.insertId,
      is_new: true,
      message: "Contact created successfully.",
    });
  } catch (err) {
    logger.error("Error creating contact:", err);
    res.status(500).json({ success: false, message: "Failed to create contact." });
  }
});

// GET /api/v1/contacts/:id - Retrieve single contact
router.get("/contacts/:id", authenticateApi, async (req, res) => {
  try {
    const contact = await query(
      `SELECT * FROM contact WHERE id = ? AND uid = ?`,
      [req.params.id, req.uid]
    );

    if (contact.length === 0) {
      return res.status(404).json({ success: false, message: "Contact not found." });
    }

    const c = contact[0];
    res.json({
      success: true,
      contact: {
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        phonebook_id: c.phonebook_id,
        pipeline_stage: c.pipeline_stage,
        lead_temperature: c.lead_temperature,
        email: c.email || c.var1,
        company: c.company || c.var2,
        job_title: c.job_title || c.var3,
        address: c.address || c.var4,
        website: c.website || c.var5,
        notes: c.notes || c.var6,
        source: c.source,
        created_at: c.createdAt || c.created_at,
      },
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error fetching contact." });
  }
});

// PUT /api/v1/contacts/:id - Update contact
router.put("/contacts/:id", authenticateApi, async (req, res) => {
  try {
    const { name, mobile, email, company, job_title, address, website, notes, pipeline_stage, lead_temperature } =
      req.body;

    const existing = await query(
      `SELECT id FROM contact WHERE id = ? AND uid = ?`,
      [req.params.id, req.uid]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "Contact not found." });
    }

    await query(
      `UPDATE contact SET 
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        email = COALESCE(?, email),
        company = COALESCE(?, company),
        job_title = COALESCE(?, job_title),
        address = COALESCE(?, address),
        website = COALESCE(?, website),
        notes = COALESCE(?, notes),
        pipeline_stage = COALESCE(?, pipeline_stage),
        lead_temperature = COALESCE(?, lead_temperature)
      WHERE id = ? AND uid = ?`,
      [
        name,
        mobile ? mobile.replace(/[^0-9]/g, "") : null,
        email,
        company,
        job_title,
        address,
        website,
        notes,
        pipeline_stage,
        lead_temperature,
        req.params.id,
        req.uid,
      ]
    );

    res.json({ success: true, message: "Contact updated successfully." });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error updating contact." });
  }
});

// DELETE /api/v1/contacts/:id - Delete contact
router.delete("/contacts/:id", authenticateApi, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM contact WHERE id = ? AND uid = ?`,
      [req.params.id, req.uid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Contact not found." });
    }

    res.json({ success: true, message: "Contact deleted successfully." });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error deleting contact." });
  }
});

// ─── PIPELINE & KANBAN REST API ───────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "new_scanned", title: "New Scanned", color: "#3b82f6" },
  { id: "contacted", title: "Contacted", color: "#8b5cf6" },
  { id: "meeting_set", title: "Meeting Set", color: "#f59e0b" },
  { id: "proposal_sent", title: "Proposal Sent", color: "#ec4899" },
  { id: "won", title: "Won / Closed", color: "#10b981" },
  { id: "lost", title: "Lost", color: "#ef4444" },
  { id: "follow_up_later", title: "Follow Up", color: "#64748b" },
];

// GET /api/v1/pipeline - Get Kanban board stages and grouped lead cards
router.get("/pipeline", authenticateApi, async (req, res) => {
  try {
    // 1. Fetch contacts
    const contacts = await query(
      `SELECT id, name, mobile, email, company, job_title, pipeline_stage, lead_temperature, source, createdAt FROM contact WHERE uid = ? ORDER BY id DESC`,
      [req.uid]
    );

    // 2. Map contacts to stages (including dynamic unlabeled fallback)
    const stageMap = {};
    PIPELINE_STAGES.forEach((s) => {
      stageMap[s.id] = { ...s, cards: [] };
    });

    const unlabeledCards = [];

    contacts.forEach((contact) => {
      const stageKey = (contact.pipeline_stage || "").toLowerCase();
      if (stageKey && stageMap[stageKey]) {
        stageMap[stageKey].cards.push(contact);
      } else {
        unlabeledCards.push(contact);
      }
    });

    const columns = Object.values(stageMap);

    // Add dynamic Unlabeled column if contacts exist without assigned stage
    if (unlabeledCards.length > 0) {
      columns.unshift({
        id: "unlabeled",
        title: "Unlabeled / Inbound",
        color: "#64748b",
        is_unlabeled: true,
        cards: unlabeledCards,
      });
    }

    res.json({
      success: true,
      total_contacts: contacts.length,
      columns,
    });
  } catch (err) {
    logger.error("Pipeline fetch error:", err);
    res.status(500).json({ success: false, message: "Error fetching pipeline board." });
  }
});

// POST /api/v1/pipeline/move - Move lead to different stage
router.post("/pipeline/move", authenticateApi, async (req, res) => {
  try {
    const { contact_id, stage, pipeline_stage } = req.body;
    const targetStage = stage || pipeline_stage;

    if (!contact_id || !targetStage) {
      return res.status(400).json({
        success: false,
        message: "'contact_id' and 'stage' are required.",
      });
    }

    await query(
      `UPDATE contact SET pipeline_stage = ? WHERE id = ? AND uid = ?`,
      [targetStage, contact_id, req.uid]
    );

    res.json({
      success: true,
      message: "Lead stage updated successfully.",
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error moving lead stage." });
  }
});

// ─── AI BUSINESS CARD SCANNER API ─────────────────────────────────────────────

// POST /api/v1/card-scan - Scan card image & auto-extract contact
router.post("/card-scan", authenticateApi, async (req, res) => {
  try {
    let imageBuffer = null;
    let mimeType = "image/jpeg";

    // Support Base64 payload or multipart file upload
    if (req.body.image) {
      let b64 = req.body.image;
      if (b64.includes(";base64,")) {
        const parts = b64.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        b64 = parts[1];
      }
      imageBuffer = Buffer.from(b64, "base64");
    } else if (req.files && req.files.cardImage) {
      imageBuffer = req.files.cardImage.data;
      mimeType = req.files.cardImage.mimetype || "image/jpeg";
    }

    if (!imageBuffer) {
      return res.status(400).json({
        success: false,
        message: "No card image provided. Submit 'image' as base64 string or 'cardImage' as file upload.",
      });
    }

    // Call Gemini Vision AI
    const parsedData = await parseBusinessCard(imageBuffer, mimeType);

    // Ensure phone number exists
    const cleanMobile = parsedData.mobile ? parsedData.mobile.replace(/[^0-9]/g, "") : null;

    let savedContactId = null;

    if (cleanMobile) {
      // Find or create phonebook
      let pbId = 0;
      const pb = await query(`SELECT id FROM phonebook WHERE uid = ? LIMIT 1`, [req.uid]);
      if (pb.length > 0) {
        pbId = pb[0].id;
      } else {
        const newPb = await query(`INSERT INTO phonebook (name, uid) VALUES (?, ?)`, [
          "Card Scans",
          req.uid,
        ]);
        pbId = newPb.insertId;
      }

      // Check if contact exists
      const existing = await query(
        `SELECT id FROM contact WHERE uid = ? AND mobile = ?`,
        [req.uid, cleanMobile]
      );

      if (existing.length > 0) {
        savedContactId = existing[0].id;
        await query(
          `UPDATE contact SET 
            name = COALESCE(?, name),
            var1 = COALESCE(?, var1),
            var2 = COALESCE(?, var2),
            var3 = COALESCE(?, var3),
            var4 = COALESCE(?, var4),
            var5 = COALESCE(?, var5),
            var6 = COALESCE(?, var6)
          WHERE id = ? AND uid = ?`,
          [
            parsedData.name || null,
            parsedData.email || null,
            parsedData.company || null,
            parsedData.job_title || null,
            parsedData.address || null,
            parsedData.website || null,
            parsedData.notes || null,
            savedContactId,
            req.uid,
          ]
        );
      } else {
        const insertRes = await query(
          `INSERT INTO contact (uid, phonebook_id, name, mobile, var1, var2, var3, var4, var5, var6, tag)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.uid,
            pbId,
            parsedData.name || "Business Card Contact",
            cleanMobile,
            parsedData.email || "",
            parsedData.company || "",
            parsedData.job_title || "",
            parsedData.address || "",
            parsedData.website || "",
            parsedData.notes || "",
            "card_scan",
          ]
        );
        savedContactId = insertRes.insertId;
      }
    }

    res.json({
      success: true,
      extracted_data: parsedData,
      contact_id: savedContactId,
      auto_saved: Boolean(savedContactId),
      message: "Business card successfully digitized.",
    });
  } catch (err) {
    logger.error("Card scan error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process business card image.",
    });
  }
});

// ─── MESSAGING & TEMPLATES API ────────────────────────────────────────────────

// POST /api/v1/send-message - Send text or media message via Meta Cloud API
router.post("/send-message", authenticateApi, async (req, res) => {
  try {
    const { messageObject, enableLog } = req.body;

    if (!messageObject) {
      return res.status(400).json({
        success: false,
        message: "'messageObject' is required in request body.",
      });
    }

    const getMetaApi = await query(`SELECT * FROM meta_api WHERE uid = ?`, [req.uid]);
    if (getMetaApi.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meta Cloud API keys are not configured for this user.",
      });
    }

    const waToken = getMetaApi[0]?.access_token;
    const waNumId = getMetaApi[0]?.business_phone_number_id;

    if (!waToken || !waNumId) {
      return res.status(400).json({
        success: false,
        message: "Meta Phone Number ID or Access Token is missing.",
      });
    }

    const sendMsg = await sendAPIMessage(messageObject, waNumId, waToken);

    if (enableLog) {
      await query(
        `INSERT INTO beta_api_logs (uid, msg_id, request, response, status) VALUES (?,?,?,?,?)`,
        [
          req.uid,
          sendMsg?.data?.id || null,
          JSON.stringify(messageObject),
          JSON.stringify(sendMsg),
          sendMsg?.data?.id ? "processing" : "failed",
        ]
      );
    }

    res.json(sendMsg);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error sending message." });
  }
});

// POST /api/v1/send_templet - Send approved Meta WhatsApp template
router.post("/send_templet", authenticateApi, async (req, res) => {
  try {
    const { sendTo, templetName, exampleArr = [], mediaUri = null, enableLog } = req.body;

    if (!sendTo || !templetName) {
      return res.status(400).json({
        success: false,
        message: "'sendTo' and 'templetName' are required.",
      });
    }

    const getMetaApi = await query(`SELECT * FROM meta_api WHERE uid = ?`, [req.uid]);
    if (getMetaApi.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meta Cloud API credentials not found.",
      });
    }

    const waToken = getMetaApi[0]?.access_token;
    const waNumId = getMetaApi[0]?.business_phone_number_id;

    const templet = await getMetaTempletByName(templetName, getMetaApi[0]);
    if (templet.error || !templet?.data || templet.data.length === 0) {
      return res.status(400).json({
        success: false,
        message: templet.error?.message || "Template not found or not approved by Meta.",
      });
    }

    const resp = await sendMetatemplet(
      sendTo.replace("+", ""),
      waNumId,
      waToken,
      templet.data[0],
      exampleArr,
      mediaUri
    );

    if (enableLog) {
      await query(
        `INSERT INTO beta_api_logs (uid, msg_id, request, response, status) VALUES (?,?,?,?,?)`,
        [
          req.uid,
          resp?.messages ? resp.messages[0]?.id : null,
          JSON.stringify({ sendTo, templetName, exampleArr, mediaUri }),
          JSON.stringify(resp),
          resp?.messages ? "sent" : "failed",
        ]
      );
    }

    res.json({
      success: !resp.error,
      metaResponse: resp,
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ success: false, message: "Error sending template message." });
  }
});

// GET /api/v1/templates - List approved WhatsApp templates
router.get("/templates", authenticateApi, async (req, res) => {
  try {
    const getMetaApi = await query(`SELECT * FROM meta_api WHERE uid = ?`, [req.uid]);
    if (getMetaApi.length === 0) {
      return res.json({ success: true, templates: [] });
    }

    const localTemplates = await query(`SELECT * FROM templets WHERE uid = ?`, [req.uid]);
    res.json({
      success: true,
      templates: (localTemplates || []).map((t) => ({
        id: t.id,
        name: t.title || `template_${t.id}`,
        category: t.type || "MARKETING",
        language: "en_US",
        status: "APPROVED",
      })),
    });
  } catch (err) {
    logger.error("Error fetching templates in /api/v1/templates:", err);
    res.status(500).json({ success: false, message: "Error fetching templates." });
  }
});

// GET /api/v1/get_logs - Query API message logs
router.get("/get_logs", authenticateApi, async (req, res) => {
  try {
    const data = await query(
      `SELECT * FROM beta_api_logs WHERE uid = ? ORDER BY id DESC LIMIT 200`,
      [req.uid]
    );

    const sanitizeJsonStr = (val, rowStatus) => {
      if (!val) return "{}";
      let parsed = null;
      if (typeof val === "object") {
        parsed = val;
      } else if (typeof val === "string") {
        try {
          parsed = JSON.parse(val);
        } catch (e) {
          return "{}";
        }
      }
      if (!parsed || typeof parsed !== "object") return "{}";

      // Meta Cloud API responses return { messaging_product, contacts, messages: [{ id, message_status }] }
      // The web UI expects a top-level `success: true` to display 'Success' (in green).
      if (parsed.success === undefined) {
        if ((parsed.messages && !parsed.error) || ["sent", "delivered", "read"].includes(rowStatus)) {
          parsed.success = true;
        }
      }

      return JSON.stringify(parsed);
    };

    const sanitizedLogs = (data || []).map((row) => ({
      id: row.id,
      uid: row.uid,
      msg_id: row.msg_id || "",
      status: row.status || "sent",
      request: sanitizeJsonStr(row.request, row.status),
      response: sanitizeJsonStr(row.response, row.status),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    }));

    res.json({
      success: true,
      data: sanitizedLogs,
      logs: sanitizedLogs,
      total: sanitizedLogs.length,
    });
  } catch (err) {
    logger.error("Error fetching logs in /get_logs:", err);
    res.status(500).json({
      success: false,
      data: [],
      logs: [],
      message: "Error fetching logs.",
      msg: "Error fetching logs.",
    });
  }
});

// POST /api/v1/delete_logs - Delete log entries
router.post("/delete_logs", authenticateApi, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid 'ids' array is required.",
        msg: "Valid 'ids' array is required.",
      });
    }

    const placeholders = ids.map(() => "?").join(",");
    const result = await query(
      `DELETE FROM beta_api_logs WHERE id IN (${placeholders}) AND uid = ?`,
      [...ids, req.uid]
    );

    res.json({
      success: true,
      message: "Logs deleted successfully.",
      msg: "Logs deleted successfully.",
      count: result.affectedRows,
    });
  } catch (err) {
    logger.error("Error deleting logs in /delete_logs:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting logs.",
      msg: "Error deleting logs.",
    });
  }
});

// ─── INTERACTIVE API DOCUMENTATION & OPENAPI SPEC ─────────────────────────────

// GET /api/v1/openapi.json - OpenAPI 3.0.0 Specification
router.get("/openapi.json", (req, res) => {
  const host = req.get("host") || "msgmagnet.com";
  const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "MsgMagnet & WhatsCRM Public REST API",
      version: "5.9.8",
      description:
        "High-performance REST API for MsgMagnet WhatsApp CRM, dynamic Kanban lead pipelines, AI business card scanner, and broadcast automation.",
      contact: {
        name: "MsgMagnet Developer Support",
        url: "https://msgmagnet.com",
        email: "support@msgmagnet.com",
      },
    },
    servers: [
      { url: `${protocol}://${host}/api/v1`, description: "Current API Gateway" },
      { url: "https://msgmagnet.com/api/v1", description: "Production Server" },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "MsgMagnet API Key or Bearer JWT token",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    paths: {
      "/health": {
        get: {
          summary: "API Health Check",
          description: "Verifies that the API gateway is online and operational.",
          responses: { 200: { description: "Service is healthy" } },
        },
      },
      "/me": {
        get: {
          summary: "Current User Profile",
          description: "Fetches user details, plan limits, and quotas.",
          responses: { 200: { description: "Profile details returned" } },
        },
      },
      "/contacts": {
        get: {
          summary: "List Contacts & Leads",
          description: "Retrieve paginated contacts with optional filtering and search.",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "tag", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: { description: "Array of contacts" } },
        },
        post: {
          summary: "Create Contact / Lead",
          description: "Creates a new contact or updates if mobile number exists.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mobile"],
                  properties: {
                    name: { type: "string", example: "Sarah Connor" },
                    mobile: { type: "string", example: "+14155552671" },
                    email: { type: "string", example: "sarah@cyberdyne.com" },
                    company: { type: "string", example: "Resistance Tech" },
                    job_title: { type: "string", example: "Chief Security Officer" },
                    tag: { type: "string", example: "Hot Lead" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Contact created" } },
        },
      },
      "/pipeline": {
        get: {
          summary: "Get Pipeline & Kanban Stages",
          description: "Returns all columns, custom stages, and active lead cards.",
          responses: { 200: { description: "Kanban board data" } },
        },
      },
      "/card-scan": {
        post: {
          summary: "AI Business Card Scanner (Gemini OCR)",
          description: "Uploads card image and extracts structured contact fields via Gemini Vision.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    image: { type: "string", description: "Base64-encoded card image" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Parsed contact object" } },
        },
      },
      "/send-message": {
        post: {
          summary: "Send WhatsApp Message",
          description: "Sends a direct text or media WhatsApp message via Meta Cloud API.",
          responses: { 200: { description: "Message dispatched" } },
        },
      },
    },
  };

  res.json(spec);
});

// GET /api/v1/docs - Interactive HTML Developer Documentation
router.get("/docs", (req, res) => {
  const host = req.get("host") || "msgmagnet.com";
  const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
  const currentBase = `${protocol}://${host}/api/v1`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MsgMagnet CRM API Documentation | Production Developer Portal</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.25);
      --success: #10b981;
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --code-bg: #030712;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
    }
    .header {
      background: linear-gradient(180deg, #111827 0%, #090d16 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 40px 24px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      background: var(--accent-glow);
      color: var(--accent);
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      border: 1px solid rgba(59, 130, 246, 0.4);
    }
    .title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 16px;
      max-width: 650px;
      margin: 0 auto 24px;
    }
    .container {
      max-width: 1040px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      margin: 32px 0 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(59, 130, 246, 0.4);
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .method {
      font-weight: 800;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .method.get { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .method.post { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .method.put { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .method.delete { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .path {
      font-family: monospace;
      font-size: 16px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .desc {
      color: var(--text-muted);
      font-size: 14px;
      margin-bottom: 16px;
    }
    pre {
      background: var(--code-bg);
      border: 1px solid #1e293b;
      padding: 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      color: #cbd5e1;
      overflow-x: auto;
      margin-top: 10px;
    }
    .auth-box {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 18px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .auth-box h3 { font-size: 16px; margin-bottom: 8px; color: #93c5fd; }
    .btn {
      display: inline-block;
      background: var(--accent);
      color: white;
      text-decoration: none;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-top: 10px;
    }
    .btn:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">MSGMAGNET REST API v1</div>
    <h1 class="title">Developer API Documentation</h1>
    <p class="subtitle">Complete REST API reference for MsgMagnet & WhatsCRM. Manage contacts, leads, dynamic Kanban pipelines, AI business card scans, and WhatsApp campaigns.</p>
    <a href="${currentBase}/openapi.json" target="_blank" class="btn">View OpenAPI 3.0 Spec (.json)</a>
  </div>

  <div class="container">
    <div class="auth-box">
      <h3>🔐 Authentication</h3>
      <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 10px;">All endpoints require an authenticated API Key or Bearer JWT token. Supply your credentials using either of the following HTTP headers:</p>
      <pre>x-api-key: your_api_key_here
Authorization: Bearer your_jwt_token_here</pre>
    </div>

    <h2 class="section-title">⚡ System & Health</h2>
    <div class="card">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="path">/api/v1/health</span>
      </div>
      <p class="desc">Uptime, service readiness, and gateway version check.</p>
      <pre>Response:
{
  "success": true,
  "status": "healthy",
  "service": "MsgMagnet & WhatsCRM API Gateway",
  "version": "5.9.8"
}</pre>
    </div>

    <h2 class="section-title">👥 Contacts & Lead Management</h2>
    <div class="card">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="path">/api/v1/contacts</span>
      </div>
      <p class="desc">Retrieve paginated contacts with optional search, tag, or stage filters.</p>
      <pre>Query Parameters:
?page=1&limit=20&search=John&tag=VIP</pre>
    </div>

    <div class="card">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="path">/api/v1/contacts</span>
      </div>
      <p class="desc">Create a new lead or contact. Cleans phone number automatically.</p>
      <pre>Request Body:
{
  "name": "Sarah Connor",
  "mobile": "+14155552671",
  "email": "sarah@cyberdyne.com",
  "company": "Resistance Tech",
  "job_title": "Director of Security",
  "tag": "Hot Lead"
}</pre>
    </div>

    <h2 class="section-title">📊 Dynamic Kanban & Lead Pipelines</h2>
    <div class="card">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="path">/api/v1/pipeline</span>
      </div>
      <p class="desc">Fetches all pipeline columns, stages, and cards (including the dynamic Unlabeled stage).</p>
    </div>

    <div class="card">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="path">/api/v1/pipeline/move</span>
      </div>
      <p class="desc">Move a contact card to a different pipeline stage in real-time.</p>
      <pre>Request Body:
{
  "contact_id": 142,
  "stage_id": 3,
  "stage_name": "Proposal Sent"
}</pre>
    </div>

    <h2 class="section-title">📷 AI Business Card OCR Scanner</h2>
    <div class="card">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="path">/api/v1/card-scan</span>
      </div>
      <p class="desc">Extract contact details from a business card image using Google Gemini Vision AI.</p>
      <pre>Request Body:
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}</pre>
    </div>

    <h2 class="section-title">💬 WhatsApp Messaging & Broadcasts</h2>
    <div class="card">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="path">/api/v1/send-message</span>
      </div>
      <p class="desc">Send direct WhatsApp message via Meta Cloud API.</p>
    </div>

    <div class="card">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="path">/api/v1/send_templet</span>
      </div>
      <p class="desc">Send an approved Meta interactive template message.</p>
    </div>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

module.exports = router;
