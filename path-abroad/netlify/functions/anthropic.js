// netlify/functions/anthropic.js
// PathAbroad search function — uses Brave Search for live results,
// then Claude to structure them into opportunity cards.
//
// Required environment variables in Netlify:
//   ANTHROPIC_API_KEY  — from console.anthropic.com
//   BRAVE_API_KEY      — from api-dashboard.search.brave.com

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const BRAVE_KEY     = process.env.BRAVE_API_KEY;

  if (!ANTHROPIC_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured." }) };
  if (!BRAVE_KEY)     return { statusCode: 500, headers, body: JSON.stringify({ error: "BRAVE_API_KEY not configured." }) };

  try {
    const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });

    // Step 1 — search Brave for live opportunities
    const queries = [
      "scholarships African students 2025 2026 fully funded open applications",
      "internships fellowships African applicants international organizations 2025",
      "remote jobs international NGO African professionals 2025",
    ];

    const searchResults = [];
    for (const q of queries) {
      try {
        const r = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&freshness=pm`,
          { headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY } }
        );
        const data = await r.json();
        const results = (data.web?.results || []).map(x => `Title: ${x.title}\nURL: ${x.url}\nDescription: ${x.description}`).join("\n\n");
        if (results) searchResults.push(results);
      } catch(e) { /* skip failed query */ }
    }

    const webContext = searchResults.join("\n\n---\n\n").slice(0, 6000);

    // Step 2 — Claude structures the results into opportunity cards
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are an opportunity researcher for African and Ghanaian applicants. You receive live web search results and extract real opportunities from them, supplementing with your own knowledge of well-known programs. Return ONLY a raw JSON array — no markdown, no code fences. Each item: { "id":"unique_string", "title":"program name", "type":"fully-funded|partial|paid-internship|unpaid-internship", "job_type":"remote|permanent|contract|internship", "organization":"org name", "destination":"country or Global", "field":"subject area", "level":"undergraduate|masters|phd|professional|all", "deadline":"YYYY-MM-DD or Rolling or TBD", "funding":"what is covered in one sentence", "link":"real https URL", "description":"two sentences" }`,
        messages: [{
          role: "user",
          content: `Today is ${today}. Here are live web search results about current opportunities:\n\n${webContext}\n\nBased on these results and your knowledge, extract and list 8 real currently open opportunities for African/Ghanaian applicants. Include a mix of scholarships, internships, remote jobs, and fellowships. Return ONLY the JSON array.`
        }]
      })
    });

    const text = await res.text();
    return { statusCode: res.status, headers, body: text };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
