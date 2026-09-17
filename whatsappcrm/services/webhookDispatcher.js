const axios = require("axios");
const { query } = require("../database/dbpromise");

/**
 * Transforms standard MsgMagnet contact payload into platform-specific schema
 */
function formatPayloadForPlatform(platform, event, contact) {
  const names = (contact.name || "Unknown Lead").trim().split(" ");
  const firstName = names[0] || "";
  const lastName = names.slice(1).join(" ") || firstName;

  switch (platform.toLowerCase()) {
    case "hubspot":
      return {
        properties: {
          firstname: firstName,
          lastname: lastName,
          email: contact.email || "",
          phone: contact.phone || "",
          company: contact.company || "",
          jobtitle: contact.job_title || "",
          website: contact.website || "",
          hs_lead_status: contact.lead_temperature === "hot" ? "OPEN" : "IN_PROGRESS",
          msgmagnet_pipeline_stage: contact.pipeline_stage || "new",
          msgmagnet_temperature: contact.lead_temperature || "warm",
          notes: contact.notes || "",
        },
      };

    case "salesforce":
      return {
        FirstName: firstName,
        LastName: lastName || "Lead",
        Company: contact.company || "Self-Employed",
        Email: contact.email || "",
        Phone: contact.phone || "",
        Title: contact.job_title || "",
        Website: contact.website || "",
        LeadSource: "MsgMagnet WhatsApp CRM",
        Status: contact.lead_temperature === "hot" ? "Working - Contacted" : "Open - Not Contacted",
        Description: contact.notes || "",
      };

    case "zoho":
      return {
        data: [
          {
            First_Name: firstName,
            Last_Name: lastName || "Lead",
            Company: contact.company || "Independent",
            Email: contact.email || "",
            Phone: contact.phone || "",
            Designation: contact.job_title || "",
            Website: contact.website || "",
            Lead_Source: "MsgMagnet WhatsApp CRM",
            Lead_Status: contact.lead_temperature || "Warm",
            Description: contact.notes || "",
          },
        ],
      };

    case "zapier":
    case "make":
    case "custom":
    default:
      return {
        event: event,
        timestamp: new Date().toISOString(),
        source: "MsgMagnet Enterprise CRM",
        data: {
          id: contact.id,
          name: contact.name,
          first_name: firstName,
          last_name: lastName,
          phone: contact.phone,
          email: contact.email,
          company: contact.company,
          job_title: contact.job_title,
          website: contact.website,
          notes: contact.notes,
          lead_temperature: contact.lead_temperature,
          pipeline_stage: contact.pipeline_stage,
          scan_image_url: contact.scan_image_url,
          created_at: contact.createdAt || contact.created_at,
        },
      };
  }
}

/**
 * Dispatches an event to all configured webhooks for a given user
 */
async function dispatchWebhookEvent(uid, event, contact) {
  try {
    const webhooks = await query(
      "SELECT * FROM crm_webhooks WHERE uid = ? AND is_active = 1",
      [uid]
    );

    if (!webhooks || webhooks.length === 0) return { dispatched: 0 };

    const results = [];

    for (const hook of webhooks) {
      // Check if hook subscribes to this event
      const subscribedEvents = (hook.events || "").split(",").map((e) => e.trim());
      if (
        !subscribedEvents.includes("*") &&
        !subscribedEvents.includes(event) &&
        !subscribedEvents.some((e) => event.startsWith(e.replace("*", "")))
      ) {
        continue;
      }

      const payload = formatPayloadForPlatform(hook.platform, event, contact);
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "MsgMagnet-Webhook-Dispatcher/2.0",
      };

      if (hook.auth_header) {
        if (hook.auth_header.toLowerCase().startsWith("bearer ")) {
          headers["Authorization"] = hook.auth_header;
        } else {
          headers["Authorization"] = `Bearer ${hook.auth_header}`;
        }
      }

      try {
        const resp = await axios.post(hook.webhook_url, payload, {
          headers,
          timeout: 8000,
        });

        await query(
          "UPDATE crm_webhooks SET last_triggered_at = NOW(), last_status = ? WHERE id = ?",
          [resp.status, hook.id]
        );

        results.push({ id: hook.id, platform: hook.platform, status: resp.status, success: true });
      } catch (postErr) {
        const status = postErr.response ? postErr.response.status : 500;
        await query(
          "UPDATE crm_webhooks SET last_triggered_at = NOW(), last_status = ? WHERE id = ?",
          [status, hook.id]
        );
        results.push({ id: hook.id, platform: hook.platform, status, success: false, error: postErr.message });
      }
    }

    return { dispatched: results.length, results };
  } catch (err) {
    console.error("Webhook dispatch error:", err.message);
    return { dispatched: 0, error: err.message };
  }
}

/**
 * Tests a single webhook with simulated contact data
 */
async function testSingleWebhook(webhookId, uid) {
  const hooks = await query(
    "SELECT * FROM crm_webhooks WHERE id = ? AND uid = ?",
    [webhookId, uid]
  );
  if (!hooks || hooks.length === 0) throw new Error("Webhook connector not found");

  const hook = hooks[0];
  const sampleContact = {
    id: 9999,
    name: "Alex Sterling",
    phone: "+15550198834",
    email: "alex.sterling@enterprise-leads.io",
    company: "Acme Innovations Global",
    job_title: "Chief Technology Officer",
    website: "https://acme-innovations.io",
    notes: "High intent lead met at AI Summit 2026. Interested in 50-seat team bundle.",
    lead_temperature: "hot",
    pipeline_stage: "demo_scheduled",
    createdAt: new Date(),
  };

  const payload = formatPayloadForPlatform(hook.platform, "contact.created", sampleContact);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "MsgMagnet-Webhook-Dispatcher/2.0",
  };

  if (hook.auth_header) {
    headers["Authorization"] = hook.auth_header.toLowerCase().startsWith("bearer ")
      ? hook.auth_header
      : `Bearer ${hook.auth_header}`;
  }

  const startTime = Date.now();
  try {
    const resp = await axios.post(hook.webhook_url, payload, {
      headers,
      timeout: 10000,
    });
    const duration = Date.now() - startTime;

    await query(
      "UPDATE crm_webhooks SET last_triggered_at = NOW(), last_status = ? WHERE id = ?",
      [resp.status, hook.id]
    );

    return {
      success: true,
      status: resp.status,
      durationMs: duration,
      payloadSent: payload,
      responseData: resp.data,
    };
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    await query(
      "UPDATE crm_webhooks SET last_triggered_at = NOW(), last_status = ? WHERE id = ?",
      [status, hook.id]
    );

    return {
      success: false,
      status,
      error: err.message,
      payloadSent: payload,
      responseBody: err.response ? err.response.data : null,
    };
  }
}

module.exports = {
  dispatchWebhookEvent,
  testSingleWebhook,
  formatPayloadForPlatform,
};
