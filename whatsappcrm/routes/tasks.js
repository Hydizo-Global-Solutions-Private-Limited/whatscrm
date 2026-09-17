const router = require("express").Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { processVoiceToTask } = require("../services/geminiAudio");
const logger = require("../utils/logger");

// ── 1. List Tasks ────────────────────────────────────────────────────────────
router.get("/", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { status = "", priority = "", search = "", limit = 50, offset = 0 } = req.query;

    let conditions = `WHERE t.uid = ?`;
    const params = [uid];

    if (status) {
      conditions += ` AND t.status = ?`;
      params.push(status);
    }

    if (priority) {
      conditions += ` AND t.priority = ?`;
      params.push(priority);
    }

    if (search) {
      conditions += ` AND (t.title LIKE ? OR t.notes LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const tasks = await query(
      `SELECT t.*, c.name as contact_name, c.mobile as contact_mobile, c.company as contact_company
       FROM tasks t
       LEFT JOIN contact c ON t.contact_id = c.id
       ${conditions}
       ORDER BY
         CASE WHEN t.status = 'pending' THEN 1 WHEN t.status = 'in_progress' THEN 2 ELSE 3 END,
         t.due_date ASC, t.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), parseInt(offset, 10)]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM tasks t ${conditions}`,
      params
    );

    // Summary stats
    const stats = await query(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
         SUM(CASE WHEN status = 'pending' AND due_date < NOW() THEN 1 ELSE 0 END) as overdue_count
       FROM tasks WHERE uid = ?`,
      [uid]
    );

    res.json({
      success: true,
      tasks,
      total,
      stats: stats[0] || {},
    });
  } catch (err) {
    logger.error("Tasks list error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching tasks" });
  }
});

// ── 2. Create Task Manually ──────────────────────────────────────────────────
router.post("/", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      title,
      notes = "",
      due_date = null,
      priority = "medium",
      status = "pending",
      contact_id = null,
      assigned_to = null,
      source = "manual",
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, msg: "Task title is required" });
    }

    const result = await query(
      `INSERT INTO tasks (uid, contact_id, title, notes, due_date, priority, status, source, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        contact_id ? parseInt(contact_id, 10) : null,
        title,
        notes,
        due_date || null,
        priority || "medium",
        status || "pending",
        source || "manual",
        assigned_to || null,
      ]
    );

    res.json({
      success: true,
      msg: "Task created successfully",
      taskId: result.insertId,
    });
  } catch (err) {
    logger.error("Task create error:", err);
    res.status(500).json({ success: false, msg: "Server error creating task" });
  }
});

// ── 3. Voice-to-Task: Voice Note Upload & Intent Extraction ───────────────────
router.post("/voice", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    if (!req.files || !req.files.voice_note) {
      return res.status(400).json({
        success: false,
        msg: "Please upload a voice note audio file (field name: 'voice_note')",
      });
    }

    const audioFile = req.files.voice_note;
    const fileBuffer = audioFile.data;
    const mimeType = audioFile.mimetype || "audio/mp3";

    // Transcribe & extract intent via Gemini Audio
    const aiResult = await processVoiceToTask(fileBuffer, mimeType);

    // Auto-create task if intent warrants it
    let taskId = null;
    if (aiResult.task_title) {
      // Find matching contact if contact_name was mentioned
      let contact_id = null;
      if (aiResult.contact_name) {
        const matchingContacts = await query(
          `SELECT id FROM contact WHERE uid = ? AND (name LIKE ? OR company LIKE ?) LIMIT 1`,
          [uid, `%${aiResult.contact_name}%`, `%${aiResult.contact_name}%`]
        );
        if (matchingContacts.length > 0) {
          contact_id = matchingContacts[0].id;
        }
      }

      const insertResult = await query(
        `INSERT INTO tasks (uid, contact_id, title, notes, due_date, priority, status, source)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'voice_note')`,
        [
          uid,
          contact_id,
          aiResult.task_title,
          `${aiResult.actionable_notes || ""}\n[Spoken]: "${aiResult.transcription || ""}"`,
          aiResult.due_date || null,
          aiResult.priority || "medium",
        ]
      );
      taskId = insertResult.insertId;
    }

    res.json({
      success: true,
      msg: "Voice note processed successfully",
      taskId,
      extracted: aiResult,
    });
  } catch (err) {
    logger.error("Voice-to-task error:", err);
    res.status(500).json({
      success: false,
      msg: err.message || "Server error processing voice note",
    });
  }
});

// ── 4. Update Task Status or Details ─────────────────────────────────────────
router.put("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const taskId = req.params.id;
    const { title, notes, due_date, priority, status, contact_id } = req.body;

    const [existing] = await query(`SELECT * FROM tasks WHERE id = ? AND uid = ?`, [taskId, uid]);
    if (!existing) {
      return res.status(404).json({ success: false, msg: "Task not found" });
    }

    await query(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        notes = COALESCE(?, notes),
        due_date = COALESCE(?, due_date),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        contact_id = COALESCE(?, contact_id)
       WHERE id = ? AND uid = ?`,
      [
        title !== undefined ? title : null,
        notes !== undefined ? notes : null,
        due_date !== undefined ? due_date : null,
        priority !== undefined ? priority : null,
        status !== undefined ? status : null,
        contact_id !== undefined ? contact_id : null,
        taskId,
        uid,
      ]
    );

    res.json({ success: true, msg: "Task updated successfully" });
  } catch (err) {
    logger.error("Task update error:", err);
    res.status(500).json({ success: false, msg: "Server error updating task" });
  }
});

// ── 5. Delete Task ───────────────────────────────────────────────────────────
router.delete("/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const taskId = req.params.id;

    await query(`DELETE FROM tasks WHERE id = ? AND uid = ?`, [taskId, uid]);
    res.json({ success: true, msg: "Task deleted successfully" });
  } catch (err) {
    logger.error("Task delete error:", err);
    res.status(500).json({ success: false, msg: "Server error deleting task" });
  }
});

module.exports = router;
