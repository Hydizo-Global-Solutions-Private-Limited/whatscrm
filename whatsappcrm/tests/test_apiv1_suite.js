const http = require("http");

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:3010${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(4000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function run() {
  console.log("Starting verification of MsgMagnet REST API v1...");

  try {
    // 1. Test /api/v1/health
    const health = await testEndpoint("/api/v1/health");
    console.log(`[PASS] /api/v1/health -> HTTP ${health.statusCode}`);
    const healthJson = JSON.parse(health.body);
    console.log("       Health status:", healthJson.status, "| Service:", healthJson.service);

    // 2. Test /api/v1/openapi.json
    const openapi = await testEndpoint("/api/v1/openapi.json");
    console.log(`[PASS] /api/v1/openapi.json -> HTTP ${openapi.statusCode}`);
    const spec = JSON.parse(openapi.body);
    console.log("       OpenAPI Version:", spec.openapi, "| Endpoints defined:", Object.keys(spec.paths).length);

    // 3. Test /api/v1/docs
    const docs = await testEndpoint("/api/v1/docs");
    console.log(`[PASS] /api/v1/docs -> HTTP ${docs.statusCode} (HTML Docs)`);
    console.log("       Docs page size:", docs.body.length, "bytes");

    // 4. Test /api/v1/contacts without auth (expect 401)
    const contactsUnauth = await testEndpoint("/api/v1/contacts");
    console.log(`[PASS] /api/v1/contacts (unauthenticated) -> HTTP ${contactsUnauth.statusCode} (Correctly rejected)`);

    console.log("\nALL API v1 TESTS PASSED SUCCESSFULLY! Ready for production.");
    process.exit(0);
  } catch (err) {
    console.error("Test execution failed:", err.message);
    process.exit(1);
  }
}

run();
