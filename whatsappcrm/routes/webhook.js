const router = require("express").Router();
const { query } = require("../database/dbpromise.js");
const validateUser = require("../middlewares/user.js");
const { randomUUID } = require("crypto");
const logger = require("../utils/logger.js");

// 1. Get all webhooks for the logged in user
router.get("/get_webhooks", validateUser, async (req, res) => {
  try {
    const data = await query(
      "SELECT * FROM webhooks WHERE uid = ? ORDER BY id DESC",
      [req.decode.uid]
    );
    res.json({ success: true, data: data || [] });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to fetch webhooks" });
  }
});

// 2. Add a new webhook
router.post("/add_webhook", validateUser, async (req, res) => {
  try {
    const { name, description, method, secret } = req.body;
    if (!name) {
      return res.json({ success: false, msg: "Name is required" });
    }

    const webhook_id = randomUUID();
    const cleanMethod = (method || "POST").toUpperCase();

    const insertResult = await query(
      `INSERT INTO webhooks (uid, name, description, method, secret, webhook_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        req.decode.uid,
        name.trim(),
        description ? description.trim() : "",
        cleanMethod,
        secret ? secret.trim() : null,
        webhook_id,
      ]
    );

    res.json({
      success: true,
      msg: "Webhook created successfully",
      data: {
        id: insertResult.insertId,
        webhook_id,
      },
    });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to create webhook" });
  }
});

// 3. Update an existing webhook
router.post("/update_webhook", validateUser, async (req, res) => {
  try {
    const { id, name, description, method, secret, is_active } = req.body;
    if (!id || !name) {
      return res.json({ success: false, msg: "ID and Name are required" });
    }

    const cleanMethod = (method || "POST").toUpperCase();
    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    await query(
      `UPDATE webhooks 
       SET name = ?, description = ?, method = ?, secret = ?, is_active = ? 
       WHERE id = ? AND uid = ?`,
      [
        name.trim(),
        description ? description.trim() : "",
        cleanMethod,
        secret ? secret.trim() : null,
        activeVal,
        id,
        req.decode.uid,
      ]
    );

    res.json({ success: true, msg: "Webhook updated successfully" });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to update webhook" });
  }
});

// 4. Delete a webhook
router.post("/delete_webhook", validateUser, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.json({ success: false, msg: "Webhook ID required" });
    }

    const rows = await query(
      "SELECT webhook_id FROM webhooks WHERE id = ? AND uid = ?",
      [id, req.decode.uid]
    );

    if (rows && rows.length > 0) {
      const wid = rows[0].webhook_id;
      await query("DELETE FROM webhook_logs WHERE webhook_id = ?", [wid]);
    }

    await query("DELETE FROM webhooks WHERE id = ? AND uid = ?", [
      id,
      req.decode.uid,
    ]);

    res.json({ success: true, msg: "Webhook deleted successfully" });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to delete webhook" });
  }
});

// 5. Get webhook request logs
router.get("/get_webhook_logs", validateUser, async (req, res) => {
  try {
    const logs = await query(
      `SELECT wl.*, w.name AS webhook_name 
       FROM webhook_logs wl 
       LEFT JOIN webhooks w ON wl.webhook_id = w.webhook_id 
       WHERE wl.uid = ? 
       ORDER BY wl.id DESC 
       LIMIT 100`,
      [req.decode.uid]
    );
    res.json({ success: true, data: logs || [] });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to fetch logs" });
  }
});

// 6. Delete webhook logs
router.post("/delete_webhook_logs", validateUser, async (req, res) => {
  try {
    const { logIds } = req.body;
    if (Array.isArray(logIds) && logIds.length > 0) {
      await query(
        "DELETE FROM webhook_logs WHERE id IN (?) AND uid = ?",
        [logIds, req.decode.uid]
      );
    }
    res.json({ success: true, msg: "Logs deleted successfully" });
  } catch (err) {
    logger.log(err);
    res.json({ success: false, msg: "Failed to delete logs" });
  }
});

// 7. Receive incoming webhook requests
const handleIncomingWebhook = async (req, res) => {
  try {
    const { webhook_id } = req.params;
    const hooks = await query(
      "SELECT * FROM webhooks WHERE webhook_id = ?",
      [webhook_id]
    );

    if (!hooks || hooks.length === 0) {
      return res.status(404).json({ success: false, msg: "Webhook not found" });
    }

    const hook = hooks[0];
    if (!hook.is_active) {
      return res.status(400).json({ success: false, msg: "Webhook is inactive" });
    }

    const rawPayload = req.method === "GET" ? req.query : req.body;
    const payloadStr = typeof rawPayload === "object" ? JSON.stringify(rawPayload) : String(rawPayload || "");
    const eventType = (rawPayload && (rawPayload.event || rawPayload.type)) || req.headers["x-event-type"] || "webhook.received";

    await query(
      `INSERT INTO webhook_logs (uid, webhook_id, method, event_type, payload, status)
       VALUES (?, ?, ?, ?, ?, 'RECEIVED')`,
      [hook.uid, webhook_id, req.method, eventType, payloadStr]
    );

    res.json({ success: true, msg: "Webhook received" });
  } catch (err) {
    logger.log(err);
    res.status(500).json({ success: false, msg: "Webhook processing error" });
  }
};

router.post("/webhook/:webhook_id", handleIncomingWebhook);
router.get("/webhook/:webhook_id", handleIncomingWebhook);

module.exports = router;
