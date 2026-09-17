const router = require("express").Router();
const randomstring = require("randomstring");
const { query } = require("../database/dbpromise");
const validateUser = require("../middlewares/user");
const logger = require("../utils/logger");

// ── 1. Get User's Referral Hub Stats ─────────────────────────────────────────
router.get("/my", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;

    // Check if referral code exists for this user
    let [ref] = await query(`SELECT * FROM referrals WHERE referrer_uid = ? LIMIT 1`, [uid]);

    if (!ref) {
      const code = "REF" + randomstring.generate({ length: 6, charset: "alphanumeric" }).toUpperCase();
      await query(
        `INSERT INTO referrals (referrer_uid, referral_code, commission_amount, status)
         VALUES (?, ?, 0.00, 'active')`,
        [uid, code]
      );
      [ref] = await query(`SELECT * FROM referrals WHERE referrer_uid = ? LIMIT 1`, [uid]);
    }

    // Get count of referred users
    const referredList = await query(
      `SELECT r.id, r.referred_email, r.commission_amount, r.status, r.createdAt
       FROM referrals r
       WHERE r.referrer_uid = ? AND r.referred_uid IS NOT NULL
       ORDER BY r.createdAt DESC`,
      [uid]
    );

    const [sum] = await query(
      `SELECT SUM(commission_amount) as total_earned FROM referrals WHERE referrer_uid = ?`,
      [uid]
    );

    const host = req.get("host") || "localhost:3010";
    const protocol = req.protocol || "http";
    const referralLink = `${protocol}://${host}/ref/${ref.referral_code}`;

    res.json({
      success: true,
      referral_code: ref.referral_code,
      referral_link: referralLink,
      total_referred: referredList.length,
      total_earned: sum?.total_earned || 0.0,
      referred_list: referredList,
    });
  } catch (err) {
    logger.error("Get referrals error:", err);
    res.status(500).json({ success: false, msg: "Server error fetching referrals" });
  }
});

// ── 2. Track Referral Signup ────────────────────────────────────────────────
router.post("/track_signup", async (req, res) => {
  try {
    const { referral_code, new_uid, email } = req.body;

    if (!referral_code || !new_uid) {
      return res.status(400).json({ success: false, msg: "referral_code and new_uid are required" });
    }

    const [parentRef] = await query(
      `SELECT referrer_uid FROM referrals WHERE referral_code = ? LIMIT 1`,
      [referral_code.toUpperCase().trim()]
    );

    if (!parentRef) {
      return res.status(404).json({ success: false, msg: "Invalid referral code" });
    }

    const rewardBonus = 500.00; // e.g. ₹500 / $10 credits

    await query(
      `INSERT INTO referrals (referrer_uid, referred_uid, referral_code, referred_email, commission_amount, status)
       VALUES (?, ?, ?, ?, ?, 'rewarded')`,
      [parentRef.referrer_uid, new_uid, referral_code.toUpperCase().trim(), email || "", rewardBonus]
    );

    res.json({
      success: true,
      msg: "Referral signup tracked and reward credited",
    });
  } catch (err) {
    logger.error("Track referral error:", err);
    res.status(500).json({ success: false, msg: "Server error tracking referral" });
  }
});

module.exports = router;
