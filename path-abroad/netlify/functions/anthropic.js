// netlify/functions/anthropic.js
// PathAbroad — handles two request types:
//   1. Opportunities feed  → Brave Search + Claude to structure cards
//   2. CV Builder          → Claude directly with the user's own prompt
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

  try {
    // ── Read the request body the frontend sent ─────────────────────────────
    const body = JSON.parse(event.body || "{}");

    // ── ROUTE 1: CV Builder ─────────────────────────────────────────────────
    // The CV Builder sends its own system prompt about CV writing.
    // Pass it straight to Claude — no Brave Search needed.
    if (body.system && body.system.includes("CV advisor")) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":            "application/json",
          "x-api-key":               ANTHROPIC_KEY,
          "anthropic-version":       "2023-06-01",
          "anthropic-beta":          "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model:      body.model      || "claude-sonnet-4-6",
          max_tokens: body.max_tokens || 1000,
          system: [
            {
              type: "text",
              text: body.system,
              cache_control: { type: "ephemeral" }, // Cache the CV system prompt
            }
          ],
          messages: body.messages,
        }),
      });
      const text = await res.text();
      return { statusCode: res.status, headers, body: text };
    }

    // ── ROUTE 2: Opportunities feed ─────────────────────────────────────────
    // Uses Brave Search for live results, then Claude to structure them.
    if (!BRAVE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "BRAVE_API_KEY not configured." }) };
    }

    const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });

    // Step 1 — three targeted Brave searches for fresh opportunities
    const queries = [
      "fully funded scholarships African students open applications 2026",
      "internships fellowships African applicants international organizations open 2026",
      "remote jobs NGO international development African professionals open 2026",
    ];

    const searchResults = [];
const searches = await Promise.allSettled(
  queries.map(q =>
    fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&freshness=pm`,
      { headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY } }
    ).then(r => r.json())
  )
);
for (const s of searches) {
  if (s.status === "fulfilled") {
    const results = (s.value.web?.results || [])
      .map(x => `Title: ${x.title}\nURL: ${x.url}\nDescription: ${x.description}`)
      .join("\n\n");
    if (results) searchResults.push(results);
  }
}
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&freshness=pm`,
          { headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY } }
        );
        const data = await r.json();
        const results = (data.web?.results || [])
          .map(x => `Title: ${x.title}\nURL: ${x.url}\nDescription: ${x.description}`)
          .join("\n\n");
        if (results) searchResults.push(results);
      } catch (e) { /* skip failed query, continue with others */ }
    }

    const webContext = searchResults.join("\n\n---\n\n").slice(0, 6000);

    // Step 2 — Claude structures the search results into clean opportunity cards
    const SYSTEM_PROMPT = `You are an opportunity researcher for African and Ghanaian applicants worldwide. You receive live web search results and extract real, currently open opportunities from them, supplementing with your knowledge of well-known programs.

IMPORTANT RULES:
- Every opportunity must come from a DIFFERENT organisation — never repeat the same organisation or job title.
- Each item must have a unique, working URL that links DIRECTLY to that specific opportunity's application or information page — never link to a job board homepage, category page, search results page, or aggregator listing (e.g. do not link to reliefweb.int/jobs, unjobnet.com, ngojobsinafrica.com, opportunitiesforafricans.com, or any similar aggregator).
- Do NOT invent deadlines — use "Rolling" or "TBD" if unsure.
- Return ONLY a raw JSON array — no markdown, no code fences, no explanation.
- Classify type ACCURATELY:
  * "fully-funded" = scholarship or fellowship covering tuition and/or living costs
  * "partial" = scholarship covering only some costs
  * "paid-internship" = short-term placement (internship, traineeship) that pays a stipend
  * "unpaid-internship" = short-term placement with no pay
  * NEVER label a permanent job, consultancy, or professional role as "paid-internship" — use job_type "permanent", "remote", or "contract" for those and set type to "paid-internship" only for actual internships.
- Classify job_type ACCURATELY:
  * "remote" = can be done from anywhere
  * "permanent" = full-time employed position
  * "contract" = fixed-term or consultancy
  * "internship" = short-term learning placement

Each item in the array: { "id":"unique_string", "title":"program name", "type":"fully-funded|partial|paid-internship|unpaid-internship", "job_type":"remote|permanent|contract|internship", "organization":"org name", "destination":"country or Global", "field":"subject area", "level":"undergraduate|masters|phd|professional|all", "deadline":"YYYY-MM-DD or Rolling or TBD", "funding":"what is covered in one sentence", "link":"direct https URL to this specific opportunity only", "description":"two sentences max" }`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }, // Cache this — it never changes
          }
        ],
        messages: [{
          role: "user",
          content: `Today is ${today}. Here are live web search results about current opportunities:\n\n${webContext}\n\nExtract 8 real currently open opportunities for African/Ghanaian applicants — each from a different organisation. Mix of scholarships, internships, remote jobs, and fellowships. Return ONLY the JSON array.`
        }],
      }),
    });

    const text = await res.text();
    return { statusCode: res.status, headers, body: text };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};          "Content-Type":            "application/json",
          "x-api-key":               ANTHROPIC_KEY,
          "anthropic-version":       "2023-06-01",
          "anthropic-beta":          "prompt-caching-2024-07-31",
        },
        body: JSON.stringify({
          model:      body.model      || "claude-sonnet-4-6",
          max_tokens: body.max_tokens || 1000,
          system: [
            {
              type: "text",
              text: body.system,
              cache_control: { type: "ephemeral" }, // Cache the CV system prompt
            }
          ],
          messages: body.messages,
        }),
      });
      const text = await res.text();
      return { statusCode: res.status, headers, body: text };
    }

    // ── ROUTE 2: Opportunities feed ─────────────────────────────────────────
    // Uses Brave Search for live results, then Claude to structure them.
    if (!BRAVE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "BRAVE_API_KEY not configured." }) };
    }

    const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });

    // Step 1 — three targeted Brave searches for fresh opportunities
    const queries = [
      "fully funded scholarships African students open applications 2026",
      "internships fellowships African applicants international organizations open 2026",
      "remote jobs NGO international development African professionals open 2026",
    ];

    const searchResults = [];
    for (const q of queries) {
      try {
        const r = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&freshness=pm`,
          { headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_KEY } }
        );
        const data = await r.json();
        const results = (data.web?.results || [])
          .map(x => `Title: ${x.title}\nURL: ${x.url}\nDescription: ${x.description}`)
          .join("\n\n");
        if (results) searchResults.push(results);
      } catch (e) { /* skip failed query, continue with others */ }
    }

    const webContext = searchResults.join("\n\n---\n\n").slice(0, 6000);

    // Step 2 — Claude structures the search results into clean opportunity cards
    const SYSTEM_PROMPT = `You are an opportunity researcher for African and Ghanaian applicants worldwide. You receive live web search results and extract real, currently open opportunities from them, supplementing with your knowledge of well-known programs. 

IMPORTANT RULES:
- Every opportunity must come from a DIFFERENT organisation — never repeat the same organisation or job title.
- Each item must have a unique, working URL.
- Do NOT invent deadlines — use "Rolling" or "TBD" if unsure.
- Return ONLY a raw JSON array — no markdown, no code fences, no explanation.

Each item in the array: { "id":"unique_string", "title":"program name", "type":"fully-funded|partial|paid-internship|unpaid-internship", "job_type":"remote|permanent|contract|internship", "organization":"org name", "destination":"country or Global", "field":"subject area", "level":"undergraduate|masters|phd|professional|all", "deadline":"YYYY-MM-DD or Rolling or TBD", "funding":"what is covered in one sentence", "link":"real https URL", "description":"two sentences max" }`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }, // Cache this — it never changes
          }
        ],
        messages: [{
          role: "user",
          content: `Today is ${today}. Here are live web search results about current opportunities:\n\n${webContext}\n\nExtract 8 real currently open opportunities for African/Ghanaian applicants — each from a different organisation. Mix of scholarships, internships, remote jobs, and fellowships. Return ONLY the JSON array.`
        }],
      }),
    });

    const text = await res.text();
    return { statusCode: res.status, headers, body: text };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
