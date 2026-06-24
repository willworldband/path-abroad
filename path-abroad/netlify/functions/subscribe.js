// netlify/functions/subscribe.js
// Handles email subscriptions. Notifies Will and sends a welcome email via Resend.
// Optional: set RESEND_API_KEY and WILL_EMAIL in Netlify environment variables.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const WILL_EMAIL = process.env.WILL_EMAIL || "will@worldbandstudio.com";
  const FROM_EMAIL = process.env.FROM_EMAIL || "PathAbroad <noreply@pathabroad.netlify.app>";

  try {
    const { email } = JSON.parse(event.body || "{}");
    if (!email || !email.includes("@")) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email" }) };
    }
    const clean = email.trim().toLowerCase();

    if (RESEND_KEY) {
      const send = (to, subject, text) =>
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
        });
      await send([WILL_EMAIL], `New PathAbroad subscriber: ${clean}`, `New subscriber: ${clean}\n\nAdd to your weekly digest list.\n\nPathAbroad · pathabroad.netlify.app`);
      await send([clean], "You're on the PathAbroad weekly digest", `Hi,\n\nYou're subscribed to the PathAbroad weekly digest.\n\nEvery Monday — the top 10 open scholarships, internships, and international jobs for African applicants worldwide.\n\nNo spam. Unsubscribe any time.\n\nPathAbroad · pathabroad.netlify.app`);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }
};
