const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { generateQRDataURL, generateQRBuffer, buildVCard } = require("../services/qrGenerator");
const logger = require("../utils/logger");

// ── 1. Public JSON API for Digital Profile ────────────────────────────────────
router.get("/public/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const profiles = await query(
      `SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1`,
      [username.toLowerCase().trim()]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, msg: "Digital profile not found" });
    }

    const profile = profiles[0];
    query(`UPDATE digital_profiles SET views = views + 1 WHERE id = ?`, [profile.id]).catch(() => {});

    try {
      profile.links = typeof profile.links === "string" ? JSON.parse(profile.links) : profile.links;
    } catch {
      profile.links = [];
    }

    try {
      profile.services = typeof profile.services === "string" ? JSON.parse(profile.services) : profile.services;
    } catch {
      profile.services = [];
    }

    res.json({ success: true, profile });
  } catch (err) {
    logger.error("Public profile fetch error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ── 2. Download vCard (.vcf) for iPhone / Android Contacts ───────────────────
router.get("/vcard/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [profile] = await query(
      `SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1`,
      [username.toLowerCase().trim()]
    );

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    const vCardText = buildVCard(profile);

    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${profile.username}.vcf"`);
    res.send(vCardText);
  } catch (err) {
    logger.error("vCard download error:", err);
    res.status(500).send("Error generating vCard");
  }
});

// ── 3. Get QR Code for Profile ───────────────────────────────────────────────
router.get("/qr/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const profileUrl = `${protocol}://${host}/p/${username}`;

    if (req.query.format === "image") {
      const buffer = await generateQRBuffer(profileUrl);
      res.setHeader("Content-Type", "image/png");
      return res.send(buffer);
    }

    const dataUrl = await generateQRDataURL(profileUrl);
    res.json({ success: true, profileUrl, qrDataUrl: dataUrl });
  } catch (err) {
    logger.error("QR generation error:", err);
    res.status(500).json({ success: false, msg: "Error generating QR code" });
  }
});

// ── 4. Authenticated: Get All Personas ─────────────────────────────────────────
router.get("/personas", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const personas = await query(
      "SELECT id, username, display_name, title, company, persona_type, photo_url, lead_capture_mode, is_active FROM digital_profiles WHERE uid = ? ORDER BY id ASC",
      [uid]
    );
    res.json({ success: true, personas: personas || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

// ── 5. Authenticated: Get My Profile ─────────────────────────────────────────
router.get("/my", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const requestedPersona = req.query.persona || "corporate";

    let [profile] = await query(
      `SELECT * FROM digital_profiles WHERE uid = ? AND persona_type = ? LIMIT 1`,
      [uid, requestedPersona]
    );

    if (!profile) {
      // Fallback to any profile for this user
      const anyProfile = await query(
        `SELECT * FROM digital_profiles WHERE uid = ? LIMIT 1`,
        [uid]
      );
      if (anyProfile.length > 0) profile = anyProfile[0];
    }

    if (!profile) {
      return res.json({ success: true, profile: null, hasProfile: false });
    }

    try {
      profile.links = typeof profile.links === "string" ? JSON.parse(profile.links) : profile.links;
    } catch {
      profile.links = [];
    }

    try {
      profile.services = typeof profile.services === "string" ? JSON.parse(profile.services) : profile.services;
    } catch {
      profile.services = [];
    }

    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const profileUrl = `${protocol}://${host}/p/${profile.username}`;
    const qrDataUrl = await generateQRDataURL(profileUrl);

    res.json({ success: true, profile, hasProfile: true, profileUrl, qrDataUrl });
  } catch (err) {
    logger.error("Get my profile error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ── 6. Authenticated: Create or Update Profile / Persona ─────────────────────
router.post("/save", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const {
      username,
      display_name,
      title = "",
      company = "",
      bio = "",
      whatsapp = "",
      phone = "",
      email = "",
      website = "",
      location = "",
      links = "[]",
      services = "[]",
      theme = "dark",
      is_active = 1,
      persona_type = "corporate",
      lead_capture_mode = 0,
      custom_domain = "",
    } = req.body;

    if (!username || !display_name) {
      return res.status(400).json({
        success: false,
        msg: "Username and display name are required",
      });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // Check if username taken by another user
    const [existing] = await query(
      `SELECT id, uid FROM digital_profiles WHERE username = ?`,
      [cleanUsername]
    );

    if (existing && existing.uid !== uid) {
      return res.status(400).json({
        success: false,
        msg: "Username is already taken by another user",
      });
    }

    let photo_url = req.body.photo_url || null;
    let cover_url = req.body.cover_url || null;

    // Handle file upload for photo / cover
    const uploadDir = path.resolve(process.cwd(), "./client/public/media/profiles");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (req.files && req.files.photo) {
      const pFile = req.files.photo;
      const pExt = path.extname(pFile.name) || ".jpg";
      const pName = `avatar_${uid}_${Date.now()}${pExt}`;
      fs.writeFileSync(path.join(uploadDir, pName), pFile.data);
      photo_url = `/media/profiles/${pName}`;
    }

    if (req.files && req.files.cover) {
      const cFile = req.files.cover;
      const cExt = path.extname(cFile.name) || ".jpg";
      const cName = `cover_${uid}_${Date.now()}${cExt}`;
      fs.writeFileSync(path.join(uploadDir, cName), cFile.data);
      cover_url = `/media/profiles/${cName}`;
    }

    const linksJson = typeof links === "object" ? JSON.stringify(links) : links;
    const servicesJson = typeof services === "object" ? JSON.stringify(services) : services;

    const [existingPersona] = await query(
      `SELECT id, photo_url, cover_url FROM digital_profiles WHERE uid = ? AND persona_type = ?`,
      [uid, persona_type]
    );

    if (existingPersona) {
      const finalPhoto = photo_url || existingPersona.photo_url;
      const finalCover = cover_url || existingPersona.cover_url;

      await query(
        `UPDATE digital_profiles SET
          username = ?, display_name = ?, title = ?, company = ?,
          bio = ?, photo_url = ?, cover_url = ?, whatsapp = ?,
          phone = ?, email = ?, website = ?, location = ?,
          links = ?, services = ?, theme = ?, is_active = ?,
          lead_capture_mode = ?, custom_domain = ?
         WHERE id = ? AND uid = ?`,
        [
          cleanUsername,
          display_name,
          title,
          company,
          bio,
          finalPhoto,
          finalCover,
          whatsapp,
          phone,
          email,
          website,
          location,
          linksJson,
          servicesJson,
          theme || "dark",
          is_active ? 1 : 0,
          lead_capture_mode ? 1 : 0,
          custom_domain || null,
          existingPersona.id,
          uid,
        ]
      );
    } else {
      await query(
        `INSERT INTO digital_profiles (
          uid, username, display_name, title, company,
          bio, photo_url, cover_url, whatsapp, phone,
          email, website, location, links, services, theme, is_active,
          persona_type, lead_capture_mode, custom_domain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uid,
          cleanUsername,
          display_name,
          title,
          company,
          bio,
          photo_url,
          cover_url,
          whatsapp,
          phone,
          email,
          website,
          location,
          linksJson,
          servicesJson,
          theme || "dark",
          is_active ? 1 : 0,
          persona_type,
          lead_capture_mode ? 1 : 0,
          custom_domain || null,
        ]
      );
    }

    res.json({
      success: true,
      msg: "Digital profile persona saved successfully",
      username: cleanUsername,
      persona_type,
    });
  } catch (err) {
    logger.error("Save profile error:", err);
    res.status(500).json({ success: false, msg: err.message || "Server error saving profile" });
  }
});

// ── 7. Public: Reciprocal Contact Swap ("Lead Capture Mode" Wall) ─────────────
router.post("/swap", async (req, res) => {
  try {
    const { profile_username, name, phone, email, company, notes } = req.body;

    if (!profile_username || !name || !phone) {
      return res.status(400).json({ success: false, msg: "Name and phone number are required to exchange contacts" });
    }

    const [profile] = await query(
      "SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1",
      [profile_username.toLowerCase().trim()]
    );

    if (!profile) {
      return res.status(404).json({ success: false, msg: "Profile not found" });
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, "");

    // Check if phonebook exists for owner
    const [pb] = await query(
      "SELECT id, name FROM phonebook WHERE uid = ? LIMIT 1",
      [profile.uid]
    );
    const phonebook_id = pb ? pb.id : 0;
    const phonebook_name = pb ? pb.name : "Default";

    // Insert lead into CRM
    const insertResult = await query(
      `INSERT INTO contact (
        uid, phonebook_id, phonebook_name, name, mobile,
        company, email, notes, source, lead_temperature, pipeline_stage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'lead_capture_wall', 'warm', 'new')`,
      [
        profile.uid,
        phonebook_id,
        phonebook_name,
        name.trim(),
        cleanPhone,
        company ? company.trim() : "",
        email ? email.trim() : "",
        notes ? `[Reciprocal Swap]: ${notes.trim()}` : "[Reciprocal Swap from Digital Card]",
      ]
    );

    const contactId = insertResult.insertId;

    // Log Activity
    await query(
      `INSERT INTO contact_activity (uid, contact_id, activity_type, description, metadata)
       VALUES (?, ?, 'RECIPROCAL_SWAP_UNLOCKED', ?, ?)`,
      [
        profile.uid,
        contactId,
        `Contact info received via Reciprocal Swap Wall on @${profile_username}`,
        JSON.stringify({ visitor_name: name, visitor_phone: cleanPhone, visitor_email: email, company }),
      ]
    ).catch(() => {});

    // Trigger CRM Webhooks
    try {
      const { dispatchWebhookEvent } = require("../services/webhookDispatcher");
      dispatchWebhookEvent(profile.uid, "contact.created", {
        id: contactId,
        name,
        phone: cleanPhone,
        email,
        company,
        notes,
        lead_temperature: "warm",
        pipeline_stage: "new",
      }).catch(() => {});
    } catch (_) {}

    // Trigger Round-Robin Assignment
    try {
      const { assignLeadToNextAgent } = require("../services/roundRobinService");
      assignLeadToNextAgent(profile.uid, contactId).catch(() => {});
    } catch (_) {}

    // Parse links and services for full display
    try {
      profile.links = typeof profile.links === "string" ? JSON.parse(profile.links) : profile.links;
    } catch {
      profile.links = [];
    }

    res.json({
      success: true,
      msg: "Contact exchanged successfully! Profile unlocked.",
      profile: {
        display_name: profile.display_name,
        title: profile.title,
        company: profile.company,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        email: profile.email,
        website: profile.website,
        location: profile.location,
        links: profile.links,
        vcard_url: `/api/profile/vcard/${profile.username}`,
        apple_wallet_url: `/api/wallet/apple/${profile.username}`,
        google_wallet_url: `/api/wallet/google/${profile.username}`,
      },
    });
  } catch (err) {
    logger.error("Reciprocal swap error:", err);
    res.status(500).json({ success: false, msg: err.message || "Error completing contact swap" });
  }
});

// ── 8. Public HTML View: /p/:username ─────────────────────────────────────────
router.get("/html/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [profile] = await query(
      `SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1`,
      [username.toLowerCase().trim()]
    );

    if (!profile) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Profile Not Found - MsgMagnet</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff;">
          <h2>Profile Not Found</h2>
          <p>The requested digital profile "@${username}" does not exist or has been deactivated.</p>
        </body>
        </html>
      `);
    }

    query(`UPDATE digital_profiles SET views = views + 1 WHERE id = ?`, [profile.id]).catch(() => {});

    let links = [];
    try {
      links = typeof profile.links === "string" ? JSON.parse(profile.links) : (profile.links || []);
    } catch {}

    let services = [];
    try {
      services = typeof profile.services === "string" ? JSON.parse(profile.services) : (profile.services || []);
    } catch {}

    const isDark = (profile.theme || "dark") === "dark";
    const bg = isDark ? "#090d16" : "#f8fafc";
    const cardBg = isDark ? "#131b2e" : "#ffffff";
    const text = isDark ? "#f8fafc" : "#0f172a";
    const textMuted = isDark ? "#94a3b8" : "#64748b";
    const border = isDark ? "#1e293b" : "#e2e8f0";
    const hasLeadCaptureWall = profile.lead_capture_mode === 1;

    const linksHtml = links.map(l => `
      <a href="${l.url || '#'}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;margin-bottom:10px;background:${cardBg};border:1px solid ${border};border-radius:14px;color:${text};text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 2px 4px rgba(0,0,0,0.05);transition:transform 0.15s ease;">
        <span style="display:flex;align-items:center;gap:12px;">
          <span>${l.icon || '🔗'}</span>
          <span>${l.title || l.label || 'Link'}</span>
        </span>
        <span style="color:${textMuted};font-size:14px;">➔</span>
      </a>
    `).join("");

    const servicesHtml = services.length > 0 ? `
      <div style="margin-top:24px;text-align:left;">
        <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:${textMuted};margin-bottom:10px;">Services & Expertise</h4>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${services.map(s => `<span style="padding:6px 14px;background:${isDark ? '#1e293b' : '#e0e7ff'};color:${isDark ? '#e2e8f0' : '#3730a3'};border-radius:20px;font-size:13px;font-weight:500;">${s}</span>`).join("")}
        </div>
      </div>
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${profile.display_name} - Digital Business Card</title>
  <meta name="description" content="${profile.title ? profile.title + ' at ' + profile.company : 'Digital Business Card on MsgMagnet'}">
  <meta property="og:title" content="${profile.display_name}">
  <meta property="og:description" content="${profile.bio || profile.title || ''}">
  ${profile.photo_url ? `<meta property="og:image" content="${profile.photo_url}">` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: ${bg};
      color: ${text};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 16px 12px 40px;
    }
    .container { width: 100%; max-width: 440px; margin: 0 auto; }
    .card {
      background: ${cardBg};
      border: 1px solid ${border};
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,${isDark ? '0.35' : '0.08'});
      text-align: center;
      padding-bottom: 24px;
    }
    .cover {
      height: 120px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      ${profile.cover_url ? `background-image: url('${profile.cover_url}'); background-size: cover; background-position: center;` : ''}
    }
    .avatar-wrapper { margin-top: -55px; display: inline-block; position: relative; }
    .avatar {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 4px solid ${cardBg};
      object-fit: cover;
      background: #1e293b;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #10b98120;
      color: #10b981;
      margin-top: 6px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 15px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn:hover { opacity: 0.92; transform: translateY(-1px); }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-wa { background: #25D366; color: #fff; }
    .btn-wallet { background: #000000; color: #fff; border: 1px solid #334155; }
    .btn-secondary { background: ${isDark ? '#1e293b' : '#e2e8f0'}; color: ${text}; }
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 18px 0;
    }
    .full-width { grid-column: 1 / -1; }
    .swap-wall {
      background: ${isDark ? '#1e293b77' : '#f1f5f9'};
      border: 1.5px dashed #3b82f6;
      border-radius: 18px;
      padding: 20px 16px;
      margin: 18px 0;
      text-align: left;
    }
    .swap-input {
      width: 100%;
      padding: 11px 14px;
      margin-bottom: 10px;
      border-radius: 10px;
      border: 1px solid ${border};
      background: ${isDark ? '#0f172a' : '#ffffff'};
      color: ${text};
      font-size: 14px;
      outline: none;
    }
    .swap-input:focus { border-color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="cover"></div>
      <div class="avatar-wrapper">
        <img class="avatar" src="${profile.photo_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(profile.display_name)}" alt="${profile.display_name}">
      </div>
      
      <div style="padding: 12px 20px 0;">
        <h1 style="font-size: 22px; font-weight: 700;">${profile.display_name}</h1>
        ${profile.title || profile.company ? `
          <p style="color: ${textMuted}; font-size: 15px; margin-top: 4px;">
            ${profile.title || ''}${profile.title && profile.company ? ' at ' : ''}<strong>${profile.company || ''}</strong>
          </p>
        ` : ''}
        ${profile.location ? `<p style="color: ${textMuted}; font-size: 13px; margin-top: 4px;">📍 ${profile.location}</p>` : ''}
        
        <div class="badge">Verified Identity &bull; ${profile.persona_type ? profile.persona_type.toUpperCase() : 'PRO'}</div>

        ${hasLeadCaptureWall ? `
          <!-- LEAD CAPTURE MODE: RECIPROCAL SWAP WALL -->
          <div id="swap-barrier" class="swap-wall">
            <div style="text-align:center;margin-bottom:12px;">
              <span style="font-size:24px;">🤝</span>
              <h3 style="font-size:16px;font-weight:700;margin-top:4px;">Exchange Contact to Connect</h3>
              <p style="font-size:12px;color:${textMuted};margin-top:2px;">Share your contact info to instantly unlock full phone numbers, WhatsApp direct chat, and calendar links.</p>
            </div>
            <form id="swapForm" onsubmit="handleSwapSubmit(event)">
              <input class="swap-input" type="text" id="swap_name" placeholder="Your Full Name *" required />
              <input class="swap-input" type="tel" id="swap_phone" placeholder="WhatsApp / Mobile Number *" required />
              <input class="swap-input" type="email" id="swap_email" placeholder="Work Email (optional)" />
              <input class="swap-input" type="text" id="swap_company" placeholder="Company / Organization (optional)" />
              <button type="submit" id="swapBtn" class="btn btn-primary" style="margin-top:4px;">
                ⚡ Connect & Unlock Profile
              </button>
            </form>
          </div>
        ` : ''}

        <div id="full-profile-content" style="${hasLeadCaptureWall ? 'display:none;' : 'display:block;'}">
          ${profile.bio ? `
            <p style="font-size: 14px; line-height: 1.5; color: ${textMuted}; margin: 16px 0; text-align: left;">
              ${profile.bio.replace(/\n/g, '<br>')}
            </p>
          ` : '<div style="height:12px;"></div>'}

          <div class="actions-grid">
            <a class="btn btn-primary full-width" href="/api/profile/vcard/${profile.username}">
              <span>📥</span> Save to Phone Contacts
            </a>

            ${profile.whatsapp ? `
              <a class="btn btn-wa full-width" href="https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(profile.display_name)},%20I%20just%20viewed%20your%20digital%20card!" target="_blank">
                <span>💬</span> Chat on WhatsApp
              </a>
            ` : ''}

            <!-- Apple & Google Wallet Passes -->
            <a class="btn btn-wallet" href="/api/wallet/apple/${profile.username}">
              <span></span> Add to Apple Wallet
            </a>
            <a class="btn btn-wallet" href="/api/wallet/google/${profile.username}">
              <span>💳</span> Google Wallet Pass
            </a>

            ${profile.phone ? `
              <a class="btn btn-secondary" href="tel:${profile.phone}">
                <span>📞</span> Call
              </a>
            ` : ''}

            ${profile.email ? `
              <a class="btn btn-secondary" href="mailto:${profile.email}">
                <span>✉️</span> Email
              </a>
            ` : ''}
          </div>

          <div style="margin-top: 14px;">
            ${linksHtml}
          </div>

          ${servicesHtml}
        </div>

        <div style="margin-top: 30px; padding-top: 16px; border-top: 1px solid ${border}; font-size: 12px; color: ${textMuted};">
          Powered by <strong>MsgMagnet</strong> — Smart AI CRM & Networking
        </div>
      </div>
    </div>
  </div>

  <script>
    // Check if previously unlocked in browser session
    const unlockKey = "msgmagnet_unlocked_${profile.username}";
    if (localStorage.getItem(unlockKey) === "true") {
      const barrier = document.getElementById("swap-barrier");
      const content = document.getElementById("full-profile-content");
      if (barrier) barrier.style.display = "none";
      if (content) content.style.display = "block";
    }

    async function handleSwapSubmit(e) {
      e.preventDefault();
      const btn = document.getElementById("swapBtn");
      btn.innerText = "Connecting...";
      btn.disabled = true;

      const payload = {
        profile_username: "${profile.username}",
        name: document.getElementById("swap_name").value,
        phone: document.getElementById("swap_phone").value,
        email: document.getElementById("swap_email").value,
        company: document.getElementById("swap_company").value,
      };

      try {
        const resp = await fetch("/api/profile/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (data.success) {
          localStorage.setItem(unlockKey, "true");
          document.getElementById("swap-barrier").style.display = "none";
          document.getElementById("full-profile-content").style.display = "block";
        } else {
          alert(data.msg || "Error exchanging contact");
          btn.innerText = "⚡ Connect & Unlock Profile";
          btn.disabled = false;
        }
      } catch (err) {
        alert("Connection failed. Please try again.");
        btn.innerText = "⚡ Connect & Unlock Profile";
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    logger.error("Profile HTML render error:", err);
    res.status(500).send("Error rendering profile");
  }
});

module.exports = router;
