const router = require("express").Router();
const nodemailer = require("nodemailer");
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. List Email Templates ──────────────────────────────────────────────────
router.get("/templates", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const templates = await query(
      `SELECT * FROM email_templates WHERE uid = ? ORDER BY createdAt DESC`,
      [uid]
    );

    res.json({ success: true, templates });
  } catch (err) {
    logger.error("List email templates error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching email templates" });
  }
});

// ── 2. Create or Update Email Template ───────────────────────────────────────
router.post("/templates", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { id = null, title, subject, body_html, variables = ["name", "company", "profile_url"] } = req.body;

    if (!title || !subject || !body_html) {
      return res.status(400).json({
        success: false,
        msg: "title, subject, and body_html are required",
      });
    }

    const varJson = JSON.stringify(variables);

    if (id) {
      await query(
        `UPDATE email_templates SET title = ?, subject = ?, body_html = ?, variables = ?
         WHERE id = ? AND uid = ?`,
        [title, subject, body_html, varJson, id, uid]
      );
      return res.json({ success: true, msg: "Email template updated successfully", templateId: id });
    } else {
      const result = await query(
        `INSERT INTO email_templates (uid, title, subject, body_html, variables)
         VALUES (?, ?, ?, ?, ?)`,
        [uid, title, subject, body_html, varJson]
      );
      return res.json({ success: true, msg: "Email template created successfully", templateId: result.insertId });
    }
  } catch (err) {
    logger.error("Save email template error:", err);
    res.status(500).json({ success: false, msg: "Server error saving email template" });
  }
});

// ── 3. Delete Email Template ─────────────────────────────────────────────────
router.delete("/templates/:id", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const templateId = req.params.id;

    await query(`DELETE FROM email_templates WHERE id = ? AND uid = ?`, [templateId, uid]);
    res.json({ success: true, msg: "Email template deleted" });
  } catch (err) {
    logger.error("Delete email template error:", err);
    res.status(500).json({ success: false, msg: "Server error deleting template" });
  }
});

// ── 4. Send Email to Contact / Lead ──────────────────────────────────────────
router.post("/send", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { contact_id, to_email, subject, body_html, template_id } = req.body;

    let targetEmail = to_email;
    let contactData = null;

    if (contact_id) {
      const [contact] = await query(
        `SELECT * FROM contact WHERE id = ? AND uid = ?`,
        [contact_id, uid]
      );
      if (contact) {
        contactData = contact;
        if (!targetEmail) targetEmail = contact.email;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, msg: "Recipient email address is required" });
    }

    let finalSubject = subject || "Connecting from MsgMagnet";
    let finalHtml = body_html || "<p>Hello,</p>";

    // If template_id provided, load from template
    if (template_id) {
      const [tmpl] = await query(
        `SELECT * FROM email_templates WHERE id = ? AND uid = ?`,
        [template_id, uid]
      );
      if (tmpl) {
        finalSubject = tmpl.subject;
        finalHtml = tmpl.body_html;
      }
    }

    // Get user's digital profile for {{profile_url}} variable
    const [prof] = await query(`SELECT username FROM digital_profiles WHERE uid = ?`, [uid]);
    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const profileUrl = prof?.username ? `${protocol}://${host}/p/${prof.username}` : "";

    // Replace variables
    const nameVal = contactData?.name || "there";
    const companyVal = contactData?.company || "your organization";

    finalSubject = finalSubject
      .replace(/{{name}}/g, nameVal)
      .replace(/{{company}}/g, companyVal);

    finalHtml = finalHtml
      .replace(/{{name}}/g, nameVal)
      .replace(/{{company}}/g, companyVal)
      .replace(/{{profile_url}}/g, profileUrl);

    // Fetch SMTP settings
    const [smtpConfig] = await query(`SELECT * FROM smtp ORDER BY id DESC LIMIT 1`);

    if (smtpConfig && smtpConfig.host && smtpConfig.email) {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port, 10) || 587,
        secure: parseInt(smtpConfig.port, 10) === 465,
        auth: {
          user: smtpConfig.username || smtpConfig.email,
          pass: smtpConfig.password,
        },
      });

      await transporter.sendMail({
        from: `"${req.decode.userData?.name || 'MsgMagnet'}" <${smtpConfig.email}>`,
        to: targetEmail,
        subject: finalSubject,
        html: finalHtml,
      });
    }

    // Log contact activity
    if (contact_id) {
      await query(
        `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
         VALUES (?, ?, 'EMAIL_SENT', ?)`,
        [uid, contact_id, `Sent email: "${finalSubject}" to ${targetEmail}`]
      );
    }

    res.json({
      success: true,
      msg: `Email successfully sent to ${targetEmail}`,
      recipient: targetEmail,
      subject: finalSubject,
    });
  } catch (err) {
    logger.error("Send email error:", err);
    res.status(500).json({ success: false, msg: `Failed to send email: ${err.message}` });
  }
});

module.exports = router;
