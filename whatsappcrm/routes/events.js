const router = require("express").Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. List All Events for User ──────────────────────────────────────────────
router.get("/", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    const events = await query(
      `SELECT e.*,
              COUNT(c.id) as total_contacts,
              SUM(CASE WHEN c.lead_temperature = 'hot' THEN 1 ELSE 0 END) as hot_contacts,
              SUM(CASE WHEN c.lead_temperature = 'warm' THEN 1 ELSE 0 END) as warm_contacts
       FROM events e
       LEFT JOIN contact c ON e.id = c.event_id AND c.uid = ?
       WHERE e.uid = ?
       GROUP BY e.id
       ORDER BY e.event_date DESC, e.createdAt DESC`,
      [uid, uid]
    );

    res.json({ success: true, events });
  } catch (err) {
    logger.error("Events list error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching events" });
  }
});

// ── 2. Create or Update Event ────────────────────────────────────────────────
router.post("/", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      id = null,
      name,
      description = "",
      location_name = "",
      lat = null,
      lng = null,
      event_date = null,
      status = "active",
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, msg: "Event name is required" });
    }

    if (id) {
      // Update existing
      await query(
        `UPDATE events SET
          name = ?, description = ?, location_name = ?,
          lat = ?, lng = ?, event_date = ?, status = ?
         WHERE id = ? AND uid = ?`,
        [
          name,
          description,
          location_name,
          lat ? parseFloat(lat) : null,
          lng ? parseFloat(lng) : null,
          event_date || null,
          status || "active",
          id,
          uid,
        ]
      );
      return res.json({ success: true, msg: "Event updated successfully", eventId: id });
    } else {
      // Insert new
      const result = await query(
        `INSERT INTO events (uid, name, description, location_name, lat, lng, event_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          name,
          description,
          location_name,
          lat ? parseFloat(lat) : null,
          lng ? parseFloat(lng) : null,
          event_date || null,
          status || "active",
        ]
      );
      return res.json({ success: true, msg: "Event created successfully", eventId: result.insertId });
    }
  } catch (err) {
    logger.error("Event save error:", err);
    res.status(500).json({ success: false, msg: "Server error saving event" });
  }
});

// ── 3. Single Event Details & Contacts ───────────────────────────────────────
router.get("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const eventId = req.params.id;

    const [event] = await query(
      `SELECT * FROM events WHERE id = ? AND uid = ?`,
      [eventId, uid]
    );

    if (!event) {
      return res.status(404).json({ success: false, msg: "Event not found" });
    }

    const contacts = await query(
      `SELECT * FROM contact WHERE event_id = ? AND uid = ? ORDER BY createdAt DESC`,
      [eventId, uid]
    );

    res.json({ success: true, event, contacts });
  } catch (err) {
    logger.error("Event details error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching event details" });
  }
});

// ── 4. Export Event Contacts to CSV ──────────────────────────────────────────
router.get("/:id/export", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const eventId = req.params.id;

    const [event] = await query(
      `SELECT name FROM events WHERE id = ? AND uid = ?`,
      [eventId, uid]
    );

    const contacts = await query(
      `SELECT name, mobile, company, job_title, email, website, address, lead_temperature, pipeline_stage, createdAt
       FROM contact WHERE event_id = ? AND uid = ?`,
      [eventId, uid]
    );

    const headers = [
      "Name",
      "Mobile",
      "Company",
      "Job Title",
      "Email",
      "Website",
      "Address",
      "Temperature",
      "Pipeline Stage",
      "Scanned At",
    ];

    const escapeCsv = (str) => `"${(str || "").replace(/"/g, '""')}"`;

    const rows = contacts.map((c) =>
      [
        escapeCsv(c.name),
        escapeCsv(c.mobile),
        escapeCsv(c.company),
        escapeCsv(c.job_title),
        escapeCsv(c.email),
        escapeCsv(c.website),
        escapeCsv(c.address),
        escapeCsv(c.lead_temperature),
        escapeCsv(c.pipeline_stage),
        escapeCsv(new Date(c.createdAt).toISOString()),
      ].join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\r\n");
    const safeName = (event?.name || "event_leads").replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_leads.csv"`);
    res.send(csvContent);
  } catch (err) {
    logger.error("Event export error:", err);
    res.status(500).send("Error exporting event contacts");
  }
});

// ── 5. Delete Event ─────────────────────────────────────────────────────────
router.delete("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const eventId = req.params.id;

    // Unlink contacts first
    await query(`UPDATE contact SET event_id = NULL WHERE event_id = ? AND uid = ?`, [eventId, uid]);
    // Delete event
    await query(`DELETE FROM events WHERE id = ? AND uid = ?`, [eventId, uid]);

    res.json({ success: true, msg: "Event deleted successfully" });
  } catch (err) {
    logger.error("Event delete error:", err);
    res.status(500).json({ success: false, msg: "Server error deleting event" });
  }
});

module.exports = router;
