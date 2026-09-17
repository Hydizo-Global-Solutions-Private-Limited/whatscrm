const router = require("express").Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. Get Google Integration Status ─────────────────────────────────────────
router.get("/status", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const [integration] = await query(
      `SELECT id, sheet_id, sheet_name, auto_sync_sheets, auto_sync_contacts, auto_sync_calendar, updatedAt
       FROM google_integrations WHERE uid = ?`,
      [uid]
    );

    res.json({
      success: true,
      connected: !!integration,
      settings: integration || {
        sheet_id: "",
        sheet_name: "MsgMagnet Leads",
        auto_sync_sheets: 0,
        auto_sync_contacts: 0,
        auto_sync_calendar: 0,
      },
    });
  } catch (err) {
    logger.error("Google sync status error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching Google sync status" });
  }
});

// ── 2. Configure Google Sync Settings ───────────────────────────────────────
router.post("/configure", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      sheet_id = "",
      sheet_name = "MsgMagnet Leads",
      auto_sync_sheets = 1,
      auto_sync_contacts = 1,
      auto_sync_calendar = 1,
    } = req.body;

    const [existing] = await query(
      `SELECT id FROM google_integrations WHERE uid = ?`,
      [uid]
    );

    if (existing) {
      await query(
        `UPDATE google_integrations SET
          sheet_id = ?, sheet_name = ?,
          auto_sync_sheets = ?, auto_sync_contacts = ?, auto_sync_calendar = ?
         WHERE uid = ?`,
        [
          sheet_id,
          sheet_name,
          auto_sync_sheets ? 1 : 0,
          auto_sync_contacts ? 1 : 0,
          auto_sync_calendar ? 1 : 0,
          uid,
        ]
      );
    } else {
      await query(
        `INSERT INTO google_integrations (uid, sheet_id, sheet_name, auto_sync_sheets, auto_sync_contacts, auto_sync_calendar)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uid,
          sheet_id,
          sheet_name,
          auto_sync_sheets ? 1 : 0,
          auto_sync_contacts ? 1 : 0,
          auto_sync_calendar ? 1 : 0,
        ]
      );
    }

    res.json({
      success: true,
      msg: "Google Workspace settings saved successfully",
    });
  } catch (err) {
    logger.error("Google configure error:", err);
    res.status(500).json({ success: false, msg: "Server error configuring Google sync" });
  }
});

// ── 3. Export Contacts to Google Sheets / CSV Format ────────────────────────
router.post("/push_sheets", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { event_id } = req.body;

    let sql = `SELECT c.name, c.company, c.job_title, c.mobile, c.email, c.website, c.address,
                      c.lead_temperature, c.pipeline_stage, c.createdAt, e.name as event_name
               FROM contact c
               LEFT JOIN events e ON c.event_id = e.id
               WHERE c.uid = ?`;
    const params = [uid];

    if (event_id) {
      sql += ` AND c.event_id = ?`;
      params.push(event_id);
    }

    sql += ` ORDER BY c.createdAt DESC`;
    const contacts = await query(sql, params);

    // Formatted rows ready for Google Sheets API append
    const rows = contacts.map((c) => [
      c.name || "",
      c.company || "",
      c.job_title || "",
      c.mobile || "",
      c.email || "",
      c.website || "",
      c.address || "",
      c.lead_temperature || "warm",
      c.pipeline_stage || "new",
      c.event_name || "Direct / General",
      new Date(c.createdAt).toLocaleString(),
    ]);

    res.json({
      success: true,
      msg: `Prepared ${rows.length} rows for Google Sheets sync`,
      headers: [
        "Full Name",
        "Company",
        "Title",
        "Mobile Number",
        "Email",
        "Website",
        "Address",
        "Temperature",
        "Pipeline Stage",
        "Event Workspace",
        "Date Added",
      ],
      rowCount: rows.length,
      rows,
    });
  } catch (err) {
    logger.error("Google push sheets error:", err);
    res.status(500).json({ success: false, msg: "Server error pushing to sheets" });
  }
});

// ── 4. Create Calendar Follow-up Event ──────────────────────────────────────
router.post("/create_calendar_event", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { title, description = "", start_time, duration_minutes = 30, contact_id } = req.body;

    if (!title || !start_time) {
      return res.status(400).json({
        success: false,
        msg: "Event title and start_time are required",
      });
    }

    // Auto-create as task in MsgMagnet as well
    const taskResult = await query(
      `INSERT INTO tasks (uid, contact_id, title, notes, due_date, priority, status, source)
       VALUES (?, ?, ?, ?, ?, 'high', 'pending', 'google_calendar')`,
      [
        uid,
        contact_id ? parseInt(contact_id, 10) : null,
        `📅 [Calendar Event] ${title}`,
        description,
        start_time,
      ]
    );

    // Generate Google Calendar Quick Add URL
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + (duration_minutes || 30) * 60000);

    const formatGDate = (d) =>
      d.toISOString().replace(/-|:|\.\d+/g, "");

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent(description)}&dates=${formatGDate(
      startDate
    )}/${formatGDate(endDate)}`;

    res.json({
      success: true,
      msg: "Calendar event scheduled & linked to CRM tasks",
      taskId: taskResult.insertId,
      gCalUrl,
    });
  } catch (err) {
    logger.error("Create calendar event error:", err);
    res.status(500).json({ success: false, msg: "Server error creating calendar event" });
  }
});

module.exports = router;
