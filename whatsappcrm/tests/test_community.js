const axios = require("axios");

const BASE_URL = "http://localhost:3010";

async function runCommunityTests() {
  console.log("=================================================");
  console.log("Testing Community, B2B Lead Feed & Template Vault");
  console.log("=================================================\n");

  // 1. Authenticate
  const authRes = await axios.post(`${BASE_URL}/api/user/login`, {
    email: "user@user.com",
    password: "admin123",
  });
  const token = authRes.data.token;
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  console.log("✓ Authenticated with backend.\n");

  // 2. Circles
  const circlesRes = await axios.get(`${BASE_URL}/api/community/circles`);
  console.log(`✓ Industry Circles loaded: ${circlesRes.data.circles.length} circles available.`);
  console.log("  Circles:", circlesRes.data.circles.map(c => c.name).join(", "), "\n");

  // 3. Feed
  const feedRes = await axios.get(`${BASE_URL}/api/community/feed`, authHeaders);
  console.log(`✓ Community Feed loaded: ${feedRes.data.posts.length} posts found.`);
  const sample = feedRes.data.posts[0];
  console.log(`  Top Post: [${sample.post_type.toUpperCase()}] "${sample.title}" by ${sample.author_name} (${sample.author_company})`);
  console.log(`  Likes: ${sample.likes_count} | Comments: ${sample.comments_count}\n`);

  // 4. Create Post (Need / Lead Broadcast)
  const newPostRes = await axios.post(
    `${BASE_URL}/api/community/post`,
    {
      post_type: "need",
      title: "Urgent: Need Bulk Custom Branded RFID & NFC Cards (2,000 units)",
      content: "Looking for verified Indian manufacturers for ISO14443A matte finish NFC digital business cards with custom metallic gold UV embossing. Ready for sample inspection this week.",
      category: "Manufacturing",
      city: "Mumbai, India",
      circle_id: "manufacturing",
    },
    authHeaders
  );
  console.log("✓ Created new B2B Lead Requirement post:", newPostRes.data);
  const newPostId = newPostRes.data.postId;

  // 5. Like Post
  const likeRes = await axios.post(`${BASE_URL}/api/community/${newPostId}/like`, {}, authHeaders);
  console.log("✓ Toggled like on post:", likeRes.data);

  // 6. Comment on Post
  const commentRes = await axios.post(
    `${BASE_URL}/api/community/${newPostId}/comment`,
    { content: "We manufacture custom gold foil NFC smart cards in Surat with 3-day turnaround. Let's connect on WhatsApp!" },
    authHeaders
  );
  console.log("✓ Added comment to post:", commentRes.data);

  const commentsListRes = await axios.get(`${BASE_URL}/api/community/${newPostId}/comments`);
  console.log(`✓ Fetched comments for post: ${commentsListRes.data.comments.length} comment(s) found.\n`);

  // 7. Sales Template Vault
  const templatesRes = await axios.get(`${BASE_URL}/api/community/templates`);
  console.log(`✓ Sales Template Vault loaded: ${templatesRes.data.templates.length} battle-tested templates.`);
  templatesRes.data.templates.forEach(t => {
    console.log(`  - [${t.industry} / ${t.category}] "${t.title}" (${t.upvotes} upvotes)`);
  });

  console.log("\n=================================================");
  console.log("COMMUNITY & B2B LEAD ENGINE FULLY VALIDATED!");
  console.log("=================================================");
  process.exit(0);
}

runCommunityTests().catch(err => {
  console.error("Test error:", err.response ? err.response.data : err.message);
  process.exit(1);
});
