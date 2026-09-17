const QRCode = require("qrcode");

/**
 * Generates a Data URL (base64 image) for a given text or URL
 * @param {string} text 
 * @param {Object} [options]
 * @returns {Promise<string>} data:image/png;base64,...
 */
async function generateQRDataURL(text, options = {}) {
  const defaultOpts = {
    errorCorrectionLevel: "H",
    type: "image/png",
    quality: 0.95,
    margin: 2,
    color: {
      dark: options.darkColor || "#0f172a",
      light: options.lightColor || "#ffffff",
    },
    width: options.width || 360,
  };

  return await QRCode.toDataURL(text, defaultOpts);
}

/**
 * Generates a PNG Buffer for a given text or URL
 * @param {string} text 
 * @param {Object} [options]
 * @returns {Promise<Buffer>}
 */
async function generateQRBuffer(text, options = {}) {
  const defaultOpts = {
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: options.darkColor || "#0f172a",
      light: options.lightColor || "#ffffff",
    },
    width: options.width || 400,
  };

  return await QRCode.toBuffer(text, defaultOpts);
}

/**
 * Builds a valid vCard 3.0 string for contacts/digital profiles
 * @param {Object} profile
 * @returns {string} vCard string
 */
function buildVCard(profile) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.display_name || profile.name || ""}`,
    `N:${(profile.display_name || profile.name || "").split(" ").reverse().join(";")};;;`,
  ];

  if (profile.company) lines.push(`ORG:${profile.company}`);
  if (profile.title || profile.job_title) lines.push(`TITLE:${profile.title || profile.job_title}`);
  if (profile.phone || profile.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${profile.phone || profile.mobile}`);
  if (profile.whatsapp) lines.push(`TEL;TYPE=WHATSAPP:${profile.whatsapp}`);
  if (profile.email) lines.push(`EMAIL;TYPE=INTERNET:${profile.email}`);
  if (profile.website) lines.push(`URL:${profile.website}`);
  if (profile.location || profile.address) lines.push(`ADR;TYPE=WORK:;;${profile.location || profile.address};;;;`);
  if (profile.bio || profile.notes) lines.push(`NOTE:${(profile.bio || profile.notes || "").replace(/\n/g, "\\n")}`);
  if (profile.photo_url) lines.push(`PHOTO;VALUE=URI:${profile.photo_url}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

module.exports = {
  generateQRDataURL,
  generateQRBuffer,
  buildVCard,
};
