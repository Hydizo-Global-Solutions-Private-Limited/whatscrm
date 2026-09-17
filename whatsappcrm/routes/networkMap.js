const router = require("express").Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. Get Contacts for Network Map ──────────────────────────────────────────
router.get("/contacts", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { event_id, lead_temperature, search, require_coords } = req.query;

    let conditions = `WHERE c.uid = ?`;
    const params = [uid];

    if (require_coords === "true") {
      conditions += ` AND (c.lat IS NOT NULL AND c.lng IS NOT NULL)`;
    }

    if (event_id) {
      conditions += ` AND c.event_id = ?`;
      params.push(event_id);
    }

    if (lead_temperature) {
      conditions += ` AND c.lead_temperature = ?`;
      params.push(lead_temperature);
    }

    if (search) {
      conditions += ` AND (c.name LIKE ? OR c.company LIKE ? OR c.address LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const contacts = await query(
      `SELECT c.id, c.name, c.company, c.job_title, c.mobile, c.email,
              c.lat, c.lng, c.address, c.lead_temperature, c.pipeline_stage,
              c.source, c.scan_image_url, c.createdAt,
              e.name as event_name
       FROM contact c
       LEFT JOIN events e ON c.event_id = e.id
       ${conditions}
       ORDER BY c.createdAt DESC`,
      params
    );

    // Also get all events with coordinates
    const events = await query(
      `SELECT id, name, location_name, lat, lng, event_date
       FROM events WHERE uid = ? AND lat IS NOT NULL AND lng IS NOT NULL`,
      [uid]
    );

    res.json({
      success: true,
      contacts,
      events,
      count: contacts.length,
    });
  } catch (err) {
    logger.error("Network map contacts error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching map contacts" });
  }
});

// ── 2. Update Contact Location Coordinates ───────────────────────────────────
router.post("/update_location", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id, lat, lng, address } = req.body;

    if (!contact_id || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, msg: "contact_id, lat, and lng are required" });
    }

    await query(
      `UPDATE contact SET
        lat = ?, lng = ?, address = COALESCE(?, address)
       WHERE id = ? AND uid = ?`,
      [parseFloat(lat), parseFloat(lng), address || null, contact_id, uid]
    );

    res.json({ success: true, msg: "Location updated successfully" });
  } catch (err) {
    logger.error("Update contact location error:", err);
    res.status(500).json({ success: false, msg: "Server error updating location" });
  }
});

// ── 3. Network Summary Stats ────────────────────────────────────────────────
router.get("/summary", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    const [stats] = await query(
      `SELECT
         COUNT(*) as total_contacts,
         SUM(CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 1 ELSE 0 END) as mapped_contacts,
         SUM(CASE WHEN lead_temperature = 'hot' THEN 1 ELSE 0 END) as hot_leads,
         SUM(CASE WHEN lead_temperature = 'warm' THEN 1 ELSE 0 END) as warm_leads,
         SUM(CASE WHEN lead_temperature = 'cold' THEN 1 ELSE 0 END) as cold_leads,
         SUM(CASE WHEN source = 'scanned' THEN 1 ELSE 0 END) as scanned_cards
       FROM contact WHERE uid = ?`,
      [uid]
    );

    res.json({ success: true, stats });
  } catch (err) {
    logger.error("Network summary error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching summary" });
  }
});

module.exports = router;
