/**
 * MsgMagnet 1-Click Interactive Email Signature Generator
 * Produces email-client compliant inline-styled HTML signatures
 * Compatible with Gmail, Apple Mail, Microsoft Outlook, and Thunderbird
 */

function generateSignatureHtml(profile, style = "modern", baseUrl = "http://localhost:3010") {
  const name = profile.display_name || "Professional Contact";
  const title = profile.title || "";
  const company = profile.company || "";
  const phone = profile.phone || profile.whatsapp || "";
  const email = profile.email || "";
  const website = profile.website || "";
  const profileUrl = `${baseUrl}/p/${profile.username || ""}`;
  const avatarUrl = profile.photo_url
    ? (profile.photo_url.startsWith("http") ? profile.photo_url : `${baseUrl}${profile.photo_url}`)
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  const qrUrl = `${baseUrl}/api/profile/qr/${profile.username}?format=image`;

  if (style === "corporate") {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b; max-width: 520px;">
  <tr>
    <td valign="top" style="padding-right: 16px; border-right: 2px solid #2563eb;">
      <img src="${avatarUrl}" alt="${name}" width="72" height="72" style="border-radius: 8px; display: block; object-fit: cover;" />
    </td>
    <td valign="top" style="padding-left: 16px;">
      <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px;">${name}</div>
      <div style="font-size: 13px; color: #475569; font-weight: 500; margin-bottom: 6px;">
        ${title}${title && company ? ' | ' : ''}<strong>${company}</strong>
      </div>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #64748b;">
        ${phone ? `<tr><td style="padding-bottom: 2px;">📞 <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a></td></tr>` : ''}
        ${email ? `<tr><td style="padding-bottom: 2px;">✉️ <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td></tr>` : ''}
        ${website ? `<tr><td style="padding-bottom: 2px;">🌐 <a href="${website}" target="_blank" style="color: #2563eb; text-decoration: none;">${website}</a></td></tr>` : ''}
        <tr>
          <td style="padding-top: 6px;">
            <a href="${profileUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-decoration: none;">
              📲 Save Digital Business Card
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 10px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 8px;">
      This message was sent from ${company || name}. Powered by MsgMagnet AI Networking CRM.
    </td>
  </tr>
</table>`.trim();
  }

  if (style === "sales") {
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.4; color: #0f172a; max-width: 500px; background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid #e2e8f0;">
  <tr>
    <td valign="center" style="padding-right: 14px;">
      <img src="${avatarUrl}" alt="${name}" width="65" height="65" style="border-radius: 50%; display: block; border: 2px solid #2563eb;" />
    </td>
    <td valign="center">
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${name}</div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${title} @ ${company}</div>
      <div style="margin-top: 6px;">
        ${profile.whatsapp ? `
          <a href="https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(name)},%20saw%20your%20email%20signature!" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-decoration: none; margin-right: 6px;">
            💬 Chat on WhatsApp
          </a>
        ` : ''}
        <a href="${profileUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-decoration: none;">
          ⚡ View Profile & Links
        </a>
      </div>
    </td>
    <td valign="center" align="right" style="padding-left: 12px;">
      <a href="${profileUrl}" target="_blank">
        <img src="${qrUrl}" alt="Scan to connect" width="55" height="55" style="display: block; border: 1px solid #cbd5e1; border-radius: 6px;" />
      </a>
      <div style="font-size: 9px; color: #94a3b8; text-align: center; margin-top: 2px;">Scan Card</div>
    </td>
  </tr>
</table>`.trim();
  }

  // Modern Minimalist (Default)
  return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b; max-width: 480px;">
  <tr>
    <td valign="top" style="padding-right: 14px;">
      <img src="${avatarUrl}" alt="${name}" width="60" height="60" style="border-radius: 50%; display: block; object-fit: cover;" />
    </td>
    <td valign="top">
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${name}</div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">${title ? `${title} &bull; ` : ''}${company}</div>
      <div style="font-size: 12px; color: #475569;">
        ${phone ? `<span>📞 ${phone}</span> &nbsp;|&nbsp; ` : ''}
        ${email ? `<a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>` : ''}
      </div>
      <div style="margin-top: 6px; font-size: 12px;">
        <a href="${profileUrl}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: none;">
          👉 View Digital Business Card & Contact Details &rarr;
        </a>
      </div>
    </td>
  </tr>
</table>`.trim();
}

module.exports = {
  generateSignatureHtml,
};
