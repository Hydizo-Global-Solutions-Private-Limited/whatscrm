const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { testSingleWebhook, dispatchWebhookEvent } = require("../services/webhookDispatcher");

/**
 * GET /api/webhooks/list
 * List all configured CRM connectors for the authenticated user
 */
router.get("/list", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const hooks = await query(
      "SELECT id, name, platform, webhook_url, events, is_active, last_triggered_at, last_status, createdAt FROM crm_webhooks WHERE uid = ? ORDER BY id DESC",
      [uid]
    );
    res.json({ success: true, webhooks: hooks || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/webhooks/templates
 * Return pre-built connector templates and documentation
 */
router.get("/templates", validateUser, (req, res) => {
  res.json({
    success: true,
    platforms: [
      {
        id: "hubspot",
        name: "HubSpot CRM",
        description: "Auto-syncs cards and leads into HubSpot Contacts with pipeline stage & lead warmth.",
        sampleUrl: "https://api.hubapi.com/crm/v3/objects/contacts or Zapier/Make Webhook URL",
        authHeaderHint: "Bearer pat-na1-...",
      },
      {
        id: "salesforce",
        name: "Salesforce CRM",
        description: "Creates Lead records in Salesforce Sales Cloud with Company, Lead Source, and notes.",
        sampleUrl: "https://yourinstance.salesforce.com/services/data/v58.0/sobjects/Lead or middleware endpoint",
        authHeaderHint: "Bearer 00D5...",
      },
      {
        id: "zoho",
        name: "Zoho CRM",
        description: "Streams leads directly to Zoho CRM Leads module with full contact details.",
        sampleUrl: "https://www.zohoapis.com/crm/v2/Leads or webhook receiver",
        authHeaderHint: "Zoho-oauthtoken ...",
      },
      {
        id: "zapier",
        name: "Zapier / Make / n8n",
        description: "Connect to 5,000+ business apps via Catch Hook URL.",
        sampleUrl: "https://hooks.zapier.com/hooks/catch/...",
        authHeaderHint: "Optional secret token",
      },
    ],
  });
});

/**
 * POST /api/webhooks/create
 * Create a new CRM webhook connector
 */
router.post("/create", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { name, platform, webhook_url, auth_header, events } = req.body;

    if (!name || !webhook_url || !platform) {
      return res.status(400).json({ success: false, msg: "Name, platform, and Webhook URL are required" });
    }

    try {
      new URL(webhook_url);
    } catch (_) {
      return res.status(400).json({ success: false, msg: "Invalid Webhook URL format" });
    }

    const result = await query(
      `INSERT INTO crm_webhooks (uid, name, platform, webhook_url, auth_header, events, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        uid,
        name.trim(),
        platform.trim().toLowerCase(),
        webhook_url.trim(),
        auth_header ? auth_header.trim() : null,
        events || "contact.created,contact.updated",
      ]
    );

    res.json({
      success: true,
      msg: "CRM Webhook connector created successfully",
      webhookId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * PUT /api/webhooks/:id/toggle
 * Toggle active status
 */
router.put("/:id/toggle", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await query(
      "UPDATE crm_webhooks SET is_active = IF(is_active = 1, 0, 1) WHERE id = ? AND uid = ?",
      [req.params.id, uid]
    );
    res.json({ success: true, msg: "Webhook connector status toggled" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Triggers a live test dispatch with sample lead data
 */
router.post("/:id/test", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const testResult = await testSingleWebhook(req.params.id, uid);
    res.json({ success: true, result: testResult });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a connector
 */
router.delete("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    await query("DELETE FROM crm_webhooks WHERE id = ? AND uid = ?", [req.params.id, uid]);
    res.json({ success: true, msg: "Webhook connector removed" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
