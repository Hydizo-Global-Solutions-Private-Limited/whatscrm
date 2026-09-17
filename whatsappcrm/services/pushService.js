const { query } = require("../database/dbpromise");

/**
 * Dispatch push notifications to Expo Push API / FCM / APNs
 */
async function sendPushToUser(uid, { title, body, data = {} }) {
  try {
    const rows = await query("SELECT token FROM device_tokens WHERE uid = ?", [uid]);
    if (!rows || rows.length === 0) {
      return { success: false, msg: "No registered push device tokens for user" };
    }

    const messages = rows.map((r) => ({
      to: r.token,
      sound: "default",
      title: title || "MsgMagnet Notification",
      body: body || "",
      data,
      priority: "high",
      channelId: "msgmagnet_leads",
    }));

    // Send chunks to Expo Push Service
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return { success: true, result };
  } catch (err) {
    console.error("[PushService] Error dispatching push notification:", err.message);
    return { success: false, msg: err.message };
  }
}

/**
 * Trigger notification when a new card is scanned via AI
 */
async function sendLeadScannedPush(uid, contact) {
  const name = contact.name || "New Prospect";
  const company = contact.company ? ` (${contact.company})` : "";
  return sendPushToUser(uid, {
    title: `📇 New Lead Captured: ${name}`,
    body: `Scanned and added${company} to your CRM. Lead Warmth: ${(contact.lead_temperature || "warm").toUpperCase()}`,
    data: { screen: "CardDetail", contactId: contact.id },
  });
}

/**
 * Trigger notification when an exchange link is completed
 */
async function sendCardExchangePush(uid, leadName) {
  return sendPushToUser(uid, {
    title: "🤝 Viral Card Exchange Complete!",
    body: `${leadName || "A prospect"} viewed your digital card and shared their reciprocal contact details.`,
    data: { screen: "CardsList" },
  });
}

/**
 * Trigger task reminder push notification
 */
async function sendTaskReminderPush(uid, task) {
  return sendPushToUser(uid, {
    title: "⏰ Follow-up Reminder",
    body: task.title || "You have a task due soon.",
    data: { screen: "Tasks", taskId: task.id },
  });
}

module.exports = {
  sendPushToUser,
  sendLeadScannedPush,
  sendCardExchangePush,
  sendTaskReminderPush,
};
