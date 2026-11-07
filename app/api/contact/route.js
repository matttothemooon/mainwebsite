import { getProfile } from "@/lib/storage";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_STORE = { "Cache-Control": "no-store" };
const CATEGORIES = new Set([
  "Moderation",
  "Community management",
  "Streaming and content",
  "Collaboration",
  "Other",
]);

function invalid(message) {
  return Response.json({ error: message }, { status: 400, headers: NO_STORE });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return invalid("Send a valid contact form.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return invalid("Send a valid contact form.");
  }
  if (typeof body.website === "string" && body.website.trim()) {
    return invalid("This message could not be accepted.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
    return invalid("Enter a name of 1–100 characters without control characters.");
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return invalid("Enter a valid email address.");
  }
  if (!CATEGORIES.has(category)) return invalid("Select a valid message category.");
  if (!message || message.length > 400) {
    return invalid("Enter a message of 1–400 characters.");
  }

  const contactLink = (await getProfile({ fresh: true })).links.find(
    (link) => /^mailto:/i.test(link.url)
  );
  const to = contactLink?.url.replace(/^mailto:/i, "").split("?")[0];
  if (!to || !EMAIL_PATTERN.test(to)) {
    console.error("Contact form delivery is unavailable: no valid mailto link in profile.");
    return Response.json(
      { error: "Contact form delivery is not configured right now." },
      { status: 503, headers: NO_STORE }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Contact form delivery is unavailable: Resend environment variables are missing.");
    return Response.json(
      { error: "Contact form delivery is not configured right now." },
      { status: 503, headers: NO_STORE }
    );
  }

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Website contact: ${category} — ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nCategory: ${category}\n\n${message}`,
      }),
    });
  } catch (error) {
    console.error("Contact form delivery request failed:", error);
    return Response.json(
      { error: "Could not send your message right now. Please try again later." },
      { status: 502, headers: NO_STORE }
    );
  }

  if (!response.ok) {
    console.error("Contact form delivery failed:", response.status, await response.text());
    return Response.json(
      { error: "Could not send your message right now. Please try again later." },
      { status: 502, headers: NO_STORE }
    );
  }

  return Response.json({ ok: true }, { headers: NO_STORE });
}
