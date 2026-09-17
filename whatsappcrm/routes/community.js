const express = require("express");
const router = express.Router();
const validateUser = require("../middlewares/user");
const {
  CIRCLES,
  getFeed,
  createPost,
  toggleLike,
  addComment,
  getComments,
  getTemplates,
  seedCommunityData,
} = require("../services/communityService");

/**
 * GET /api/community/circles
 * List all industry circles/channels
 */
router.get("/circles", (req, res) => {
  res.json({ success: true, circles: CIRCLES });
});

/**
 * GET /api/community/feed
 * Paginated community feed with filters
 */
router.get("/feed", async (req, res) => {
  try {
    let uid = null;
    // Extract uid if JWT token passed in Authorization header
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWTKEY);
        uid = decoded?.uid;
      } catch (_) {}
    }

    const { circle_id, post_type, event_id, search, limit, offset } = req.query;
    const posts = await getFeed({
      uid,
      circle_id,
      post_type,
      event_id,
      search,
      limit,
      offset,
    });

    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/community/post
 * Create a new community post (Need, Offer, General, QA, Event Broadcast)
 */
router.post("/post", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { post_type, title, content, category, city, media_urls, event_id, circle_id } = req.body;

    const result = await createPost({
      uid,
      post_type,
      title,
      content,
      category,
      city,
      media_urls,
      event_id,
      circle_id,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/community/:id/like
 * Toggle like on a post
 */
router.post("/:id/like", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const result = await toggleLike(req.params.id, uid);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/community/:id/comments
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await getComments(req.params.id);
    res.json({ success: true, comments: comments || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * POST /api/community/:id/comment
 * Add a comment to a post
 */
router.post("/:id/comment", validateUser, async (req, res) => {
  try {
    const uid = req.decode.uid;
    const { content } = req.body;
    const comment = await addComment(req.params.id, uid, content);
    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * GET /api/community/templates
 * Get high-converting sales scripts & WhatsApp templates from vault
 */
router.get("/templates", async (req, res) => {
  try {
    const { industry, category } = req.query;
    const templates = await getTemplates(industry, category);
    res.json({ success: true, templates: templates || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;
