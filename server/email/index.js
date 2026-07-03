import nodemailer from "nodemailer";

const FROM = process.env.EMAIL_FROM || "PeopleCore <onboarding@resend.dev>";
const IS_DEV = (process.env.NODE_ENV || "development") === "development";

let resend = null;
let smtpTransporter = null;

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) return null;

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return smtpTransporter;
}

async function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) {
    const { Resend } = await import("resend");
    resend = new Resend(key);
  }
  return resend;
}

async function send({ to, subject, html, text, attachments }) {
  // 1. Try SMTP Transporter
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      await smtp.sendMail({
        from: FROM,
        to,
        subject,
        text,
        html,
        ...(attachments ? { attachments } : {})
      });
      return { ok: true };
    } catch (err) {
      console.warn("SMTP email sending failed:", err.message);
    }
  }

  // 2. Try Resend Service
  const client = await getResend();
  if (client) {
    try {
      await client.emails.send({
        from: FROM,
        to,
        subject,
        html,
        text,
        ...(attachments ? { attachments } : {})
      });
      return { ok: true };
    } catch (err) {
      console.warn("Resend email sending failed:", err.message);
    }
  }

  // 3. Local Development Fallback
  if (IS_DEV) {
    console.log(`\n📧 [dev email] To: ${to}\n   Subject: ${subject}\n   Attachments: ${attachments?.map(a => a.filename).join(", ") || "none"}\n   ${text || html?.slice(0, 200)}\n`);
    return { ok: true, dev: true };
  }

  console.warn("No active email sender configuration. Skipping mail send for:", subject);
  return { ok: false, skipped: true };
}

export async function sendPasswordReset({ email, code }) {
  const subject = "Your PeopleCore password reset code";
  const text = `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.`;
  const html = `<div style="font-family:sans-serif;padding:24px"><h2>PeopleCore</h2><p>Reset code: <strong style="font-size:28px;letter-spacing:6px">${code}</strong></p><p style="color:#666">Expires in 15 minutes.</p></div>`;
  return send({ to: email, subject, html, text });
}

export async function sendInvite({ email, orgName, inviteUrl, role }) {
  const subject = `You're invited to join ${orgName} on PeopleCore`;
  const text = `Join ${orgName} as ${role}: ${inviteUrl}`;
  const html = `<div style="font-family:sans-serif;padding:24px"><h2>PeopleCore</h2><p>Join <strong>${orgName}</strong> as ${role}.</p><a href="${inviteUrl}">Accept Invite</a></div>`;
  return send({ to: email, subject, html, text });
}

export async function sendWelcome({ email, name, orgName }) {
  const subject = `Welcome to PeopleCore, ${name}!`;
  const text = `Hi ${name}, ${orgName} is ready on PeopleCore.`;
  const html = `<div style="font-family:sans-serif;padding:24px"><h2>Welcome!</h2><p>Hi ${name}, <strong>${orgName}</strong> is ready.</p></div>`;
  return send({ to: email, subject, html, text });
}

export async function sendInvoiceEmail({ email, orgName, plan, amount, pdfBuffer }) {
  const subject = `Your PeopleCore Invoice for ${plan.toUpperCase()}`;
  const text = `Hi, thank you for your payment. Your invoice of $${amount} for the ${plan} plan is attached to this email.`;
  const html = `<div style="font-family:sans-serif;padding:24px"><h2>Thank you for your payment!</h2><p>Your invoice of <strong>$${amount}</strong> for the <strong>${plan}</strong> plan under <strong>${orgName}</strong> is attached to this email.</p></div>`;
  return send({
    to: email,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `invoice_${orgName}_${plan}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });
}
