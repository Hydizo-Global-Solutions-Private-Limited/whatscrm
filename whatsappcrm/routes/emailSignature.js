const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const { generateSignatureHtml } = require("../services/emailSignatureService");

/**
 * GET /api/signature/preview
 * Returns rendered HTML signature in requested style (modern, corporate, sales)
 */
router.get("/preview", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const style = req.query.style || "modern";

    const [profile] = await query("SELECT * FROM digital_profiles WHERE uid = ? LIMIT 1", [uid]);
    if (!profile) {
      return res.status(404).json({ success: false, msg: "Please create your digital business profile first" });
    }

    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const baseUrl = `${protocol}://${host}`;

    const html = generateSignatureHtml(profile, style, baseUrl);

    res.json({
      success: true,
      style,
      html,
      profile: {
        name: profile.display_name,
        company: profile.company,
        title: profile.title,
        username: profile.username,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/signature/all
 * Returns HTML signatures in all 3 styles for 1-click comparison
 */
router.get("/all", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const [profile] = await query("SELECT * FROM digital_profiles WHERE uid = ? LIMIT 1", [uid]);
    if (!profile) {
      return res.status(404).json({ success: false, msg: "Please create your digital business profile first" });
    }

    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const baseUrl = `${protocol}://${host}`;

    const styles = ["modern", "corporate", "sales"];
    const signatures = styles.map((style) => ({
      style,
      name: style === "modern" ? "Modern Minimalist" : style === "corporate" ? "Corporate Executive" : "High-Converting Sales / Networking",
      html: generateSignatureHtml(profile, style, baseUrl),
    }));

    res.json({ success: true, signatures });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
