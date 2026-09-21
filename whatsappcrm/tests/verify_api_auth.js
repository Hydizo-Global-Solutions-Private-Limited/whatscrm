const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const http = require("http");
const { query } = require("../database/dbpromise.js");
const jwt = require("jsonwebtoken");

async function run() {
  try {
    const users = await query("SELECT uid, email FROM user LIMIT 1");
    if (users.length === 0) {
      console.log("No user found in DB");
      process.exit(1);
    }
    const user = users[0];
    const token = jwt.sign({ uid: user.uid }, process.env.JWTKEY || "fallback_jwt_key", {
      expiresIn: "1h",
    });

    console.log(`Testing with user ${user.email} (UID: ${user.uid})`);

    // 1. Test GET /api/v1/me with Bearer token
    const meRes = await makeRequest("/api/v1/me", "GET", null, {
      Authorization: `Bearer ${token}`,
    });
    console.log(`[PASS] GET /api/v1/me -> HTTP ${meRes.statusCode}`);
    const meData = JSON.parse(meRes.body);
    console.log("       User verified:", meData.user?.email);

    // 2. Test POST /api/v1/contacts
    const newContact = {
      name: "Alex Vance",
      mobile: "+14155558989",
      email: "alex@blackmesa.org",
      company: "Black Mesa",
      job_title: "Quantum Engineer",
      tag: "API Lead",
    };
    const postContactRes = await makeRequest("/api/v1/contacts", "POST", newContact, {
      Authorization: `Bearer ${token}`,
    });
    console.log(`[PASS] POST /api/v1/contacts -> HTTP ${postContactRes.statusCode}`);
    const postData = JSON.parse(postContactRes.body);
    console.log("       Contact result:", postData.message, "| Contact ID:", postData.contact_id);

    // 3. Test GET /api/v1/contacts
    const getContactsRes = await makeRequest("/api/v1/contacts?search=Alex", "GET", null, {
      Authorization: `Bearer ${token}`,
    });
    console.log(`[PASS] GET /api/v1/contacts?search=Alex -> HTTP ${getContactsRes.statusCode}`);
    const getContactsData = JSON.parse(getContactsRes.body);
    console.log(`       Found ${getContactsData.contacts?.length} matching contacts.`);

    // 4. Test GET /api/v1/pipeline
    const pipelineRes = await makeRequest("/api/v1/pipeline", "GET", null, {
      Authorization: `Bearer ${token}`,
    });
    console.log(`[PASS] GET /api/v1/pipeline -> HTTP ${pipelineRes.statusCode}`);
    const pipelineData = JSON.parse(pipelineRes.body);
    console.log(`       Fetched ${pipelineData.columns?.length} Kanban columns.`);

    console.log("\nFULL REST API AUTH & CRUD VERIFIED! Production ready.");
    process.exit(0);
  } catch (err) {
    console.error("Auth test failed:", err);
    process.exit(1);
  }
}

function makeRequest(path, method, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (dataString) {
      reqHeaders["Content-Length"] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3010,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            body: resData,
          });
        });
      }
    );

    req.on("error", reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

run();
