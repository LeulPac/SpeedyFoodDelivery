const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP credentials not fully configured. Emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });

  return transporter;
};

/**
 * Send Welcome Email with Personalized Owner Portal Link
 */
const sendOwnerWelcomeEmail = async ({ toEmail, ownerName, businessName, portalCode, planName }) => {
  const adminBaseUrl = (process.env.ADMIN_PORTAL_BASE_URL || 'https://admin-nu-pied-33.vercel.app').replace(/\/$/, '');
  const portalUrl = `${adminBaseUrl}/portal/${portalCode}`;
  const sender = process.env.SMTP_FROM || `"SpeedyDelivery" <${process.env.SMTP_USER}>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to SpeedyDelivery</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f17; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #121824; border: 1px solid #1f293d; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%); padding: 36px 30px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(0,0,0,0.2); padding: 10px 18px; border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Partner Welcome</span>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">SpeedyDelivery</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 15px; margin: 6px 0 0 0;">Dedicated Owner Console</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 16px;">
                Congratulations, ${ownerName || 'Partner'}! 🎉
              </h2>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                Your business, <strong style="color: #ffffff;">${businessName}</strong>, has successfully registered and activated the <strong style="color: #FF6B00;">${planName || 'Partner'}</strong> subscription on SpeedyDelivery.
              </p>

              <!-- Dedicated Portal Link Box -->
              <div style="background-color: #1a2233; border: 1px solid #2a364f; border-radius: 16px; padding: 22px; margin-bottom: 28px;">
                <p style="color: #cbd5e1; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">
                  🔑 Your Unique Business Portal Link:
                </p>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                  This link is identical and reserved uniquely for your business. Use it whenever you sign in to manage your menu, dispatch drivers, and view live orders:
                </p>
                
                <div style="text-align: center; margin: 18px 0;">
                  <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #FF6B00; color: #ffffff; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; text-decoration: none; box-shadow: 0 8px 20px rgba(255, 107, 0, 0.35);">
                    Access ${businessName} Portal &rarr;
                  </a>
                </div>

                <div style="background-color: #121824; border-radius: 8px; padding: 10px 14px; word-break: break-all; text-align: center; border: 1px dashed #334155;">
                  <a href="${portalUrl}" target="_blank" style="color: #FF8C33; font-size: 13px; text-decoration: underline;">
                    ${portalUrl}
                  </a>
                </div>
              </div>

              <!-- Quick Start Guide -->
              <h3 style="color: #ffffff; font-size: 15px; font-weight: 700; margin-bottom: 12px;">What to do next:</h3>
              <ul style="color: #94a3b8; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0 0 28px 0;">
                <li>Sign in using your registered email: <strong style="color: #ffffff;">${toEmail}</strong></li>
                <li>Add your delicious dishes, categories, and prices under <strong>Menu Management</strong></li>
                <li>Invite or add delivery drivers in <strong>Delivery Couriers</strong></li>
                <li>Start receiving and confirming live customer orders!</li>
              </ul>

              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0; border-top: 1px solid #1f293d; padding-top: 20px;">
                Bookmark this email so you never lose your direct portal link. If you need any assistance, feel free to reply directly to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d121c; padding: 20px 30px; text-align: center; border-top: 1px solid #1a2233;">
              <p style="color: #475569; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} SpeedyDelivery Multi-Business Hub. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Welcome to SpeedyDelivery, ${ownerName}!

Your business, ${businessName}, has been registered successfully.

Your Unique Business Portal Link:
${portalUrl}

Login using your registered email: ${toEmail}
Use this link to manage your menu, couriers, and live customer orders.

- The SpeedyDelivery Team
  `;

  const mailOptions = {
    from: sender,
    to: toEmail,
    subject: `Welcome to SpeedyDelivery! Your Dedicated Owner Portal Link for ${businessName}`,
    text,
    html,
  };

  const mailer = getTransporter();
  if (mailer) {
    try {
      const info = await mailer.sendMail(mailOptions);
      console.log(`✅ Welcome email dispatched successfully to ${toEmail} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, portalUrl };
    } catch (err) {
      console.error(`❌ Failed to send welcome email to ${toEmail}:`, err.message);
      return { success: false, error: err.message, portalUrl };
    }
  } else {
    console.log(`[Email Simulated] To: ${toEmail} | Link: ${portalUrl}`);
    return { success: true, simulated: true, portalUrl };
  }
};

module.exports = {
  sendOwnerWelcomeEmail,
};
