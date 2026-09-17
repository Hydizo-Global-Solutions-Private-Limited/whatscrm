const archiverPkg = require("archiver");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const createArchive =
  typeof archiverPkg === "function"
    ? archiverPkg
    : archiverPkg.default ||
      ((type, options) => new archiverPkg.ZipArchive(options));

/**
 * Generate an Apple Wallet .pkpass ZIP buffer for a digital profile
 */
async function generateAppleWalletPass(profile, hostUrl) {
  return new Promise((resolve, reject) => {
    const archive = createArchive("zip", { zlib: { level: 9 } });
    const buffers = [];

    archive.on("data", (data) => buffers.push(data));
    archive.on("end", () => resolve(Buffer.concat(buffers)));
    archive.on("error", (err) => reject(err));

    const profileUrl = `${hostUrl}/p/${profile.username}`;

    // 1. Apple Wallet pass.json structure
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.msgmagnet.card",
      serialNumber: `MM-${profile.username}-${Date.now()}`,
      teamIdentifier: "MSGMAGNET",
      organizationName: "MsgMagnet",
      description: `${profile.display_name} - Digital Business Card`,
      logoText: "MsgMagnet",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(15, 23, 42)",
      labelColor: "rgb(148, 163, 184)",
      generic: {
        primaryFields: [
          {
            key: "name",
            label: "CONTACT",
            value: profile.display_name || profile.username,
          },
        ],
        secondaryFields: [
          {
            key: "company",
            label: "ORGANIZATION",
            value: profile.company || "MsgMagnet Network",
          },
          {
            key: "title",
            label: "ROLE",
            value: profile.title || "Business Partner",
          },
        ],
        auxiliaryFields: [
          {
            key: "phone",
            label: "WHATSAPP / PHONE",
            value: profile.whatsapp || profile.phone || "Not Listed",
          },
        ],
        backFields: [
          {
            key: "email",
            label: "EMAIL ADDRESS",
            value: profile.email || "N/A",
          },
          {
            key: "website",
            label: "WEBSITE",
            value: profile.website || profileUrl,
          },
          {
            key: "about",
            label: "BIO / SERVICES",
            value: profile.bio || "Digital Business Card powered by MsgMagnet.",
          },
          {
            key: "powered",
            label: "POWERED BY",
            value: "MsgMagnet Next-Gen Omnichannel CRM",
          },
        ],
      },
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: profileUrl,
          messageEncoding: "iso-8859-1",
          altText: "Scan to open digital card & WhatsApp chat",
        },
      ],
    };

    const passJsonString = JSON.stringify(passJson, null, 2);
    archive.append(passJsonString, { name: "pass.json" });

    // 2. Compute SHA1 manifest
    const manifest = {
      "pass.json": crypto.createHash("sha1").update(passJsonString).digest("hex"),
    };

    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    archive.finalize();
  });
}

/**
 * Generate Google Wallet Save URL or standardized deep link
 */
function generateGoogleWalletUrl(profile, hostUrl) {
  const profileUrl = `${hostUrl}/p/${profile.username}`;
  // Standard Google Wallet web pass URL format
  const passData = {
    iss: "msgmagnet-wallet@msgmagnet.iam.gserviceaccount.com",
    aud: "google",
    typ: "savetoandroidpay",
    origins: [hostUrl],
    payload: {
      genericObjects: [
        {
          id: `msgmagnet.${profile.username}`,
          classId: "msgmagnet.business_cards",
          logo: {
            sourceUri: { uri: `${hostUrl}/media/msgmagnet_logo.png` },
          },
          cardTitle: {
            defaultValue: { language: "en", value: profile.company || "MsgMagnet" },
          },
          header: {
            defaultValue: { language: "en", value: profile.display_name },
          },
          subheader: {
            defaultValue: { language: "en", value: profile.title || "Business Contact" },
          },
          barcode: {
            type: "QR_CODE",
            value: profileUrl,
            alternateText: "Scan to open digital profile",
          },
        },
      ],
    },
  };

  const encoded = Buffer.from(JSON.stringify(passData)).toString("base64url");
  return `https://pay.google.com/gp/v/save/${encoded}`;
}

module.exports = {
  generateAppleWalletPass,
  generateGoogleWalletUrl,
};
