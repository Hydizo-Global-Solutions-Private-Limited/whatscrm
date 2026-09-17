const express = require("express");
const router = express.Router();
const { query } = require("../database/dbpromise");
const { generateAppleWalletPass, generateGoogleWalletUrl } = require("../services/walletPassService");

/**
 * GET /api/wallet/apple/:username
 * Serves native Apple Wallet .pkpass file
 */
router.get("/apple/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const rows = await query(
      "SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1 LIMIT 1",
      [username.toLowerCase().trim()]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send("Digital profile not found");
    }

    const profile = rows[0];
    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const hostUrl = `${protocol}://${host}`;

    const passBuffer = await generateAppleWalletPass(profile, hostUrl);

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${profile.username}-card.pkpass"`
    );
    res.send(passBuffer);
  } catch (err) {
    console.error("Apple wallet pass error:", err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/wallet/google/:username
 * Returns or redirects to Google Wallet Save URL
 */
router.get("/google/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const rows = await query(
      "SELECT * FROM digital_profiles WHERE username = ? AND is_active = 1 LIMIT 1",
      [username.toLowerCase().trim()]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, msg: "Profile not found" });
    }

    const profile = rows[0];
    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const hostUrl = `${protocol}://${host}`;

    const googleWalletUrl = generateGoogleWalletUrl(profile, hostUrl);

    if (req.query.redirect === "true") {
      return res.redirect(googleWalletUrl);
    }

    res.json({ success: true, googleWalletUrl, saveUrl: googleWalletUrl });
  } catch (err) {
    console.error("Google wallet pass error:", err);
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
