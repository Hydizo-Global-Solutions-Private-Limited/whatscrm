const { query } = require("../database/dbpromise");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

const CIRCLES = [
  { id: "all", name: "🌐 All Ecosystem", description: "Global entrepreneur & networking feed" },
  { id: "saas_tech", name: "💻 Tech, AI & SaaS", description: "Software, automation, developers, and AI agents" },
  { id: "real_estate", name: "🏢 Real Estate & Builders", description: "Brokers, commercial spaces, and developers" },
  { id: "d2c_ecommerce", name: "📦 D2C Brands & Retail", description: "Packaging, logistics, inventory, and marketing" },
  { id: "manufacturing", name: "🏭 Manufacturing & B2B", description: "Suppliers, raw materials, import/export" },
  { id: "consulting", name: "⚖️ Legal, CA & Consulting", description: "GST, compliance, hiring, funding, strategy" },
];

/**
 * Fetch community feed with filters and like status
 */
async function getFeed({ uid, circle_id, post_type, event_id, search, limit = 30, offset = 0 }) {
  let whereClauses = ["1=1"];
  let params = [];

  if (circle_id && circle_id !== "all") {
    whereClauses.push("p.circle_id = ?");
    params.push(circle_id);
  }

  if (post_type && post_type !== "all") {
    whereClauses.push("p.post_type = ?");
    params.push(post_type);
  }

  if (event_id) {
    whereClauses.push("p.event_id = ?");
    params.push(parseInt(event_id, 10));
  }

  if (search) {
    whereClauses.push("(p.title LIKE ? OR p.content LIKE ? OR p.author_company LIKE ? OR p.category LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const sql = `
    SELECT p.*,
           CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END AS has_liked
    FROM community_posts p
    LEFT JOIN community_likes l ON p.id = l.post_id AND l.uid = ?
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY p.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  params.unshift(uid || "guest");
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const posts = await query(sql, params);
  return posts || [];
}

/**
 * Create a new community post
 */
async function createPost({
  uid,
  post_type = "general",
  title = "",
  content,
  category = "Networking",
  city = "",
  media_urls = [],
  event_id = null,
  circle_id = "all",
}) {
  if (!content || !content.trim()) {
    throw new Error("Post content is required");
  }

  // Fetch author profile
  const [profile] = await query(
    "SELECT username, display_name, title, company, photo_url, whatsapp, phone FROM digital_profiles WHERE uid = ? LIMIT 1",
    [uid]
  );

  // Fallback to user table if no digital profile yet
  let authorName = profile?.display_name;
  let authorTitle = profile?.title || "Professional Member";
  let authorCompany = profile?.company || "";
  let authorAvatar = profile?.photo_url || null;
  let authorWhatsapp = profile?.whatsapp || profile?.phone || "";
  let authorSlug = profile?.username || null;

  if (!authorName) {
    const [user] = await query("SELECT name, email, mobile FROM user WHERE uid = ? LIMIT 1", [uid]);
    authorName = user?.name || user?.email?.split("@")[0] || "Entrepreneur";
    authorWhatsapp = user?.mobile || "";
  }

  let ai_answer = null;

  // If this is a business Q&A post, generate an instant AI solution from Gemini
  if (post_type === "qa" && process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are an elite B2B sales strategist and business coach on MsgMagnet (the WhatsApp CRM & AI Networking platform).
Answer this founder's business question with a 3-step practical action plan and a high-converting WhatsApp message script they can send to solve it:
Question Title: "${title || content}"
Question Details: "${content}"`;

      const aiRes = await model.generateContent(prompt);
      ai_answer = aiRes.response.text();
    } catch (aiErr) {
      logger.error("AI Q&A generation notice:", aiErr.message);
    }
  }

  const mediaJson = typeof media_urls === "object" ? JSON.stringify(media_urls) : "[]";

  const result = await query(
    `INSERT INTO community_posts (
      uid, author_name, author_title, author_company, author_avatar,
      author_whatsapp, author_profile_slug, post_type, title,
      content, category, city, media_urls, event_id, circle_id, ai_answer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uid,
      authorName,
      authorTitle,
      authorCompany,
      authorAvatar,
      authorWhatsapp,
      authorSlug,
      post_type,
      title || null,
      content.trim(),
      category,
      city || null,
      mediaJson,
      event_id ? parseInt(event_id, 10) : null,
      circle_id,
      ai_answer,
    ]
  );

  return {
    success: true,
    postId: result.insertId,
    ai_answer,
    msg: "Post published to MsgMagnet Community!",
  };
}

/**
 * Toggle like/unlike on a post
 */
async function toggleLike(postId, uid) {
  const [existing] = await query(
    "SELECT id FROM community_likes WHERE post_id = ? AND uid = ?",
    [postId, uid]
  );

  if (existing) {
    await query("DELETE FROM community_likes WHERE id = ?", [existing.id]);
    await query("UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?", [postId]);
    return { liked: false };
  } else {
    await query("INSERT INTO community_likes (post_id, uid) VALUES (?, ?)", [postId, uid]);
    await query("UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = ?", [postId]);
    return { liked: true };
  }
}

/**
 * Add a comment to a post
 */
async function addComment(postId, uid, content) {
  if (!content || !content.trim()) throw new Error("Comment text cannot be empty");

  const [profile] = await query(
    "SELECT display_name, photo_url, whatsapp, phone FROM digital_profiles WHERE uid = ? LIMIT 1",
    [uid]
  );

  const authorName = profile?.display_name || "Community Member";
  const authorAvatar = profile?.photo_url || null;
  const authorWhatsapp = profile?.whatsapp || profile?.phone || null;

  const res = await query(
    `INSERT INTO community_comments (post_id, uid, author_name, author_avatar, author_whatsapp, content)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, uid, authorName, authorAvatar, authorWhatsapp, content.trim()]
  );

  await query("UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?", [postId]);

  return {
    commentId: res.insertId,
    author_name: authorName,
    author_avatar: authorAvatar,
    content: content.trim(),
    createdAt: new Date(),
  };
}

/**
 * Get comments for a post
 */
async function getComments(postId) {
  return await query(
    "SELECT * FROM community_comments WHERE post_id = ? ORDER BY createdAt ASC",
    [postId]
  );
}

/**
 * Get sales templates from vault
 */
async function getTemplates(industry, category) {
  let where = ["1=1"];
  let params = [];

  if (industry && industry !== "all") {
    where.push("industry = ?");
    params.push(industry);
  }

  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }

  return await query(`SELECT * FROM sales_template_vault WHERE ${where.join(" AND ")} ORDER BY upvotes DESC, id ASC`, params);
}

/**
 * Seeds initial B2B community requirements & sales scripts
 */
async function seedCommunityData() {
  try {
    const postCount = await query("SELECT COUNT(*) AS c FROM community_posts");
    if (postCount[0].c === 0) {
      console.log("Seeding initial community posts...");
      const seedPosts = [
        {
          uid: "system_admin",
          author_name: "Vikram Malhotra",
          author_title: "Procurement Director",
          author_company: "Zenith Retail Logistics",
          author_whatsapp: "+919876543210",
          author_profile_slug: "vikram_zenith",
          post_type: "need",
          title: "Looking for sustainable corrugated packaging suppliers (5,000 units/mo)",
          content: "We are expanding our retail supply chain in Maharashtra & Gujarat. Need customized 3-ply and 5-ply kraft boxes with branded flexo print. Immediate vendor onboarding. Direct manufacturers please connect on WhatsApp!",
          category: "Manufacturing",
          city: "Mumbai, India",
          circle_id: "manufacturing",
          likes_count: 14,
          comments_count: 5,
        },
        {
          uid: "system_admin",
          author_name: "Priya Sundaram",
          author_title: "Head of Growth",
          author_company: "ScaleWave Technologies",
          author_whatsapp: "+919822334455",
          author_profile_slug: "priya_scalewave",
          post_type: "offer",
          title: "Official WhatsApp Cloud API & AI Chatbot Onboarding for D2C Brands",
          content: "Helping high-growth brands reduce cart abandonment by 35% with verified green tick WhatsApp automation, 1-click COD confirmation, and automated delivery tracking. Free 15-min workflow audit.",
          category: "Tech",
          city: "Bengaluru, India",
          circle_id: "saas_tech",
          likes_count: 28,
          comments_count: 8,
        },
        {
          uid: "system_admin",
          author_name: "Rajesh Singhania",
          author_title: "Managing Partner",
          author_company: "Singhania Real Estate Advisors",
          author_whatsapp: "+919988776655",
          author_profile_slug: "singhania_realty",
          post_type: "need",
          title: "Seeking Grade-A Commercial Office Space in Cyber City (12,000 sq ft)",
          content: "Client is an AI fintech unicorn looking for ready-to-move plug & play space for 180 seats. Lease term 5 years. Direct owner or certified IPC brokers only.",
          category: "Sales",
          city: "Gurugram, India",
          circle_id: "real_estate",
          likes_count: 19,
          comments_count: 4,
        },
        {
          uid: "system_admin",
          author_name: "Arjun Nambiar",
          author_title: "Founder",
          author_company: "Kavach Cyber Sec",
          author_whatsapp: "+919711223344",
          author_profile_slug: "arjun_kavach",
          post_type: "qa",
          title: "How to overcome price resistance when selling enterprise cybersecurity SaaS?",
          content: "Prospects often say: 'Your tool is great, but we already have basic cloud firewalls and can't justify the \$15k annual contract right now.' What is the highest converting objection rebuttal to reframe risk?",
          category: "Sales",
          city: "Hyderabad, India",
          circle_id: "saas_tech",
          likes_count: 34,
          comments_count: 11,
          ai_answer: `### 🎯 The "Cost of Breach vs Prevention" Reframe Script
1. **Never defend the \$15k price point directly.** Instead, pivot immediately to their unquantified exposure:
   *"Fair enough, [Name]. If basic firewalls were 100% sufficient, enterprise ransomware insurance wouldn't exist. Can I ask — what is the estimated downtime cost if customer data is compromised for even 4 hours?"*
2. **Offer a Zero-Risk Vulnerability Audit**:
   *"Let's do this: we'll run an automated 24-hour perimeter audit at zero cost. If your current firewall catches everything, we shake hands and walk away. If we find 3 critical open vulnerabilities, we discuss moving forward. Fair?"*
3. **Send this exact WhatsApp follow-up**:
   *"Hi [Name], totally understand keeping budgets lean. Sent over a 1-page breakdown comparing the \$15k annual investment against the average \$320k recovery cost of a single breach. Let's schedule 10 mins this Thursday to see where you stand."*`,
        },
      ];

      for (const p of seedPosts) {
        await query(
          `INSERT INTO community_posts (
            uid, author_name, author_title, author_company, author_whatsapp,
            author_profile_slug, post_type, title, content, category, city,
            circle_id, likes_count, comments_count, ai_answer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.uid,
            p.author_name,
            p.author_title,
            p.author_company,
            p.author_whatsapp,
            p.author_profile_slug,
            p.post_type,
            p.title,
            p.content,
            p.category,
            p.city,
            p.circle_id,
            p.likes_count,
            p.comments_count,
            p.ai_answer || null,
          ]
        );
      }
    }

    // Seed Sales Template Vault
    const templateCount = await query("SELECT COUNT(*) AS c FROM sales_template_vault");
    if (templateCount[0].c === 0) {
      console.log("Seeding sales template vault...");
      const seedTemplates = [
        {
          title: "The Dean Jackson 9-Word Breakup Trigger",
          industry: "B2B Services",
          category: "Objection Handling",
          content: "Hi {{name}}, have you given up on {{project_or_goal}}?",
          upvotes: 89,
        },
        {
          title: "Post-Event Business Card Rapid Follow-up",
          industry: "B2B Services",
          category: "Post-Meeting Follow-up",
          content: "Hi {{name}}, pleasure meeting you at {{event_name}} today! Loved our chat regarding {{company}}'s roadmap. Here's my digital business card with my calendar link: {{profile_url}}. Let's connect for 10 mins next Tuesday?",
          upvotes: 72,
        },
        {
          title: "High-Ticket Real Estate Site Visit Invitation",
          industry: "Real Estate",
          category: "Cold Outreach",
          content: "Hi {{name}}, noticed your inquiry about premium residences in {{location}}. We just released exclusive pre-launch pricing for top 3-BHK units with panoramic city views. Would you like me to reserve a VIP site visit for you this Saturday at 11 AM?",
          upvotes: 64,
        },
        {
          title: "D2C Abandoned Cart WhatsApp Discount Nudge",
          industry: "D2C",
          category: "Closing",
          content: "Hey {{name}}! 👋 You left {{product_name}} in your cart. We saved it for you! Here is an exclusive 15% VIP discount code: SAVE15. Complete your order here in 30 seconds: {{checkout_url}}",
          upvotes: 95,
        },
        {
          title: "Enterprise Pilot Proposal Follow-Up",
          industry: "B2B Services",
          category: "Closing",
          content: "Hi {{name}}, hope you're having a productive week! We've reserved onboarding bandwidth for {{company}}'s 30-day enterprise pilot starting next Monday. Has your legal/finance team had a chance to review the SLA?",
          upvotes: 58,
        },
      ];

      for (const t of seedTemplates) {
        await query(
          `INSERT INTO sales_template_vault (title, industry, category, content, upvotes)
           VALUES (?, ?, ?, ?, ?)`,
          [t.title, t.industry, t.category, t.content, t.upvotes]
        );
      }
    }
  } catch (err) {
    console.error("Community seed error:", err.message);
  }
}

module.exports = {
  CIRCLES,
  getFeed,
  createPost,
  toggleLike,
  addComment,
  getComments,
  getTemplates,
  seedCommunityData,
};
