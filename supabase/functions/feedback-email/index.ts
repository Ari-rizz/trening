import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RECIPIENT = "utvikling@ai-assistant.no";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { type, subject, body: feedbackBody, user_email, platform, app_version } = body ?? {};

    if (!subject || !feedbackBody) {
      return new Response(JSON.stringify({ error: "Missing subject or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = type === "bug" ? "Feilrapport" : "Forslag";
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #e4e4e7;">
        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: ${type === "bug" ? "#ef444422" : "#3b82f622"}; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">${type === "bug" ? "🐛" : "💡"}</span>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #fafafa;">${typeLabel}</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #71717a;">IronGrid tilbakemelding</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Emne</p>
            <p style="margin: 0; font-size: 16px; color: #fafafa; font-weight: 600;">${escapeHtml(subject)}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Beskrivelse</p>
            <div style="font-size: 14px; color: #d4d4d8; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(feedbackBody)}</div>
          </div>

          <div style="border-top: 1px solid #27272a; padding-top: 20px; margin-top: 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em;">Brukerinfo</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #a1a1aa;">E-post: ${escapeHtml(user_email || "Ikke oppgitt")}</p>
            <p style="margin: 0 0 4px; font-size: 13px; color: #a1a1aa;">Plattform: ${escapeHtml(platform || "Ukjent")}</p>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">App-versjon: ${escapeHtml(app_version || "Ukjent")}</p>
          </div>
        </div>
        <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #52525b;">Sendt fra IronGrid feedback-skjema</p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IronGrid Feedback <onboarding@resend.dev>",
        to: [RECIPIENT],
        subject: `[IronGrid] ${typeLabel}: ${subject}`,
        html: emailHtml,
        reply_to: user_email || undefined,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("feedback-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
