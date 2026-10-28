const MODEL = "gemini-2.5-flash";
const SYSTEM_PROMPT = "You are the general information assistant for Mollah Memorial Medicine Corner. Reply in the language the user uses, preferably Bangla. Be concise. Do not diagnose, prescribe, recommend medicine doses, or replace a doctor/pharmacist. For medicine safety questions, advise checking with a licensed clinician or pharmacist. For emergencies, advise local emergency care.";

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST." }), { status: 405, headers: { "Content-Type": "application/json", "Allow": "POST" } });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Netlify-তে GEMINI_API_KEY environment variable সেট করা হয়নি।" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const contents = Array.isArray(body?.contents) ? body.contents.slice(-16) : [];
  if (!contents.length) return new Response(JSON.stringify({ error: "Message is empty." }), { status: 400, headers: { "Content-Type": "application/json" } });
  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.6, maxOutputTokens: 900 }, systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] } })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = data?.error?.message || `Gemini API returned ${upstream.status}`;
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!answer) return new Response(JSON.stringify({ error: "Gemini returned no text. Check model access or safety filters." }), { status: 502, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ answer }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Gemini service could not be reached." }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
};
