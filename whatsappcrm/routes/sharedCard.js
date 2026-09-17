const router = require("express").Router();
const randomstring = require("randomstring");
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. Create a Shared Card Token ───────────────────────────────────────────
router.post("/create", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { title = "Networking Card", contact_id = null } = req.body;

    const token = randomstring.generate({ length: 12, charset: "alphanumeric" });

    await query(
      `INSERT INTO shared_cards (uid, token, contact_id, title) VALUES (?, ?, ?, ?)`,
      [uid, token, contact_id ? parseInt(contact_id, 10) : null, title]
    );

    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const shareUrl = `${protocol}://${host}/s/${token}`;

    res.json({
      success: true,
      token,
      shareUrl,
    });
  } catch (err) {
    logger.error("Create shared card error:", err);
    res.status(500).json({ success: false, msg: "Server error generating share link" });
  }
});

// ── 2. Handle Reciprocal Contact Submission (Viral Lead Capture) ─────────────
router.post("/exchange/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, mobile, email = "", company = "", notes = "" } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ success: false, msg: "Name and Mobile number are required" });
    }

    const [shared] = await query(
      `SELECT * FROM shared_cards WHERE token = ?`,
      [token]
    );

    if (!shared) {
      return res.status(404).json({ success: false, msg: "Shared link not found or expired" });
    }

    const uid = shared.uid;
    const cleanMobile = mobile.replace(/[^\d+]/g, "").trim();

    // Insert new contact for the card owner
    const insertResult = await query(
      `INSERT INTO contact (
        uid, phonebook_name, name, mobile, company, email, notes,
        source, lead_temperature, pipeline_stage
      ) VALUES (?, 'Exchanged via Shared Card', ?, ?, ?, ?, ?, 'reciprocal_card', 'hot', 'new')`,
      [uid, name, cleanMobile, company, email, notes]
    );

    // Increment exchanges
    await query(
      `UPDATE shared_cards SET exchanges = exchanges + 1 WHERE id = ?`,
      [shared.id]
    );

    // Log activity
    await query(
      `INSERT INTO contact_activity (uid, contact_id, activity_type, description)
       VALUES (?, ?, 'CARD_EXCHANGE', ?)`,
      [uid, insertResult.insertId, `Contact received via reciprocal shared card exchange link: ${name}`]
    );

    // Trigger CRM Webhooks & Round Robin
    try {
      const { dispatchWebhookEvent } = require("../services/webhookDispatcher");
      dispatchWebhookEvent(uid, "contact.created", {
        id: insertResult.insertId,
        name,
        phone: cleanMobile,
        company,
        email,
        notes,
        lead_temperature: "hot",
        pipeline_stage: "new",
      }).catch(() => {});
    } catch (_) {}

    try {
      const { assignLeadToNextAgent } = require("../services/roundRobinService");
      assignLeadToNextAgent(uid, insertResult.insertId).catch(() => {});
    } catch (_) {}

    res.json({
      success: true,
      msg: "Your contact details have been shared successfully! Thank you for connecting.",
    });
  } catch (err) {
    logger.error("Exchange contact error:", err);
    res.status(500).json({ success: false, msg: "Server error submitting contact" });
  }
});

// ── 3. Render Public Shared Card Page (/s/:token) ───────────────────────────
router.get("/html/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [shared] = await query(`SELECT * FROM shared_cards WHERE token = ?`, [token]);

    if (!shared) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Card Link Expired - MsgMagnet</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#090d16;color:#fff;">
          <h2>Card Link Expired or Not Found</h2>
          <p style="color:#94a3b8;margin-top:10px;">This shared networking link is no longer valid.</p>
        </body>
        </html>
      `);
    }

    // Increment views
    query(`UPDATE shared_cards SET views = views + 1 WHERE id = ?`, [shared.id]).catch(() => {});

    // Get owner profile
    const [profile] = await query(`SELECT * FROM digital_profiles WHERE uid = ?`, [shared.uid]);

    const ownerName = profile?.display_name || "Professional Contact";
    const ownerTitle = profile?.title || "";
    const ownerCompany = profile?.company || "";
    const ownerAvatar = profile?.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`;
    const ownerBio = profile?.bio || "";
    const ownerWhatsApp = profile?.whatsapp || "";
    const profileUrl = profile?.username ? `/p/${profile.username}` : "#";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Connect with ${ownerName} — MsgMagnet</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #070a0f; color: #f8fafc; min-height: 100vh; display: flex; justify-content: center; padding: 20px 14px 50px; }
    .container { width: 100%; max-width: 440px; }
    .card { background: #111827; border: 1px solid #1f293d; border-radius: 24px; padding: 26px; text-align: center; box-shadow: 0 10px 35px rgba(0,0,0,0.4); margin-bottom: 20px; }
    .avatar { width: 96px; height: 96px; border-radius: 50%; border: 3px solid #2563eb; object-fit: cover; margin-bottom: 14px; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; cursor: pointer; border: none; transition: opacity 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; }
    .btn-wa { background: #25D366; color: #fff; margin-top: 10px; }
    .form-group { text-align: left; margin-bottom: 14px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; }
    .form-control { width: 100%; padding: 12px 14px; background: #090d16; border: 1px solid #1f293d; border-radius: 10px; color: #fff; font-size: 14px; outline: none; }
    .form-control:focus { border-color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <img class="avatar" src="${ownerAvatar}" alt="${ownerName}">
      <h1 style="font-size:22px;font-weight:800;">${ownerName}</h1>
      <p style="color:#94a3b8;font-size:14px;margin-top:4px;">${ownerTitle}${ownerTitle && ownerCompany ? ' at ' : ''}<strong>${ownerCompany}</strong></p>
      ${ownerBio ? `<p style="font-size:13px;color:#cbd5e1;margin:14px 0;line-height:1.5;">${ownerBio}</p>` : '<div style="height:12px;"></div>'}

      <a href="${profileUrl}" class="btn btn-primary" target="_blank">
        👁️ View Full Digital Profile
      </a>

      ${ownerWhatsApp ? `
        <a href="https://wa.me/${ownerWhatsApp.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(ownerName)},%20nice%20meeting%20you!" class="btn btn-wa" target="_blank">
          💬 Message on WhatsApp
        </a>
      ` : ''}
    </div>

    <div class="card" id="exchangeCard">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;">🤝 Share Your Card Back</h2>
      <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Send your details directly to ${ownerName}'s contact list so you can stay in touch.</p>

      <form id="exchangeForm" onsubmit="submitExchange(event)">
        <div class="form-group">
          <label>Your Full Name *</label>
          <input type="text" id="exName" class="form-control" required placeholder="e.g. Sarah Connor">
        </div>

        <div class="form-group">
          <label>WhatsApp / Mobile Number *</label>
          <input type="tel" id="exMobile" class="form-control" required placeholder="e.g. +1 555 123 4567">
        </div>

        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="exEmail" class="form-control" placeholder="e.g. sarah@example.com">
        </div>

        <div class="form-group">
          <label>Company / Designation</label>
          <input type="text" id="exCompany" class="form-control" placeholder="e.g. Product Lead, Cyberdyne">
        </div>

        <div class="form-group">
          <label>Quick Note / Meeting Context</label>
          <textarea id="exNotes" class="form-control" rows="2" placeholder="e.g. Met at booth #42, interested in WhatsApp automation"></textarea>
        </div>

        <button type="submit" id="btnSubmitEx" class="btn btn-primary" style="margin-top:8px;">
          ✨ Send My Contact Details
        </button>
      </form>

      <div id="exchangeSuccess" style="display:none;padding:20px;text-align:center;">
        <div style="font-size:42px;margin-bottom:12px;">🎉</div>
        <h3 style="font-size:18px;font-weight:700;color:#10b981;">Contact Exchanged!</h3>
        <p style="color:#94a3b8;font-size:14px;margin-top:6px;">Your contact info has been sent directly to ${ownerName}.</p>
      </div>
    </div>

    <div style="text-align:center;font-size:12px;color:#64748b;">
      Powered by <strong>MsgMagnet</strong> — Smart AI Networking
    </div>
  </div>

  <script>
    async function submitExchange(e) {
      e.preventDefault();
      const btn = document.getElementById("btnSubmitEx");
      btn.disabled = true;
      btn.textContent = "Sending...";

      const body = {
        name: document.getElementById("exName").value,
        mobile: document.getElementById("exMobile").value,
        email: document.getElementById("exEmail").value,
        company: document.getElementById("exCompany").value,
        notes: document.getElementById("exNotes").value,
      };

      try {
        const res = await fetch("/api/shared_card/exchange/${token}", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById("exchangeForm").style.display = "none";
          document.getElementById("exchangeSuccess").style.display = "block";
        } else {
          alert("Error: " + data.msg);
          btn.disabled = false;
          btn.textContent = "Send My Contact Details";
        }
      } catch(err) {
        alert("Submission failed: " + err.message);
        btn.disabled = false;
        btn.textContent = "Send My Contact Details";
      }
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    logger.error("Shared card HTML error:", err);
    res.status(500).send("Error rendering shared card");
  }
});

module.exports = router;
