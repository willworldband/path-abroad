// netlify/functions/fetch-opportunities.js
// Runs every 30 minutes on a schedule.
// Calls Claude with web search, saves results to Supabase.
// Background function — 15 minute timeout, no user waiting.
//
// Required env vars in Netlify:
//   ANTHROPIC_API_KEY
//   SUPABASE_URL      e.g. https://zblvjzxsjnlbqwxfwyzf.supabase.co
//   SUPABASE_ANON_KEY

const { schedule } = require("@netlify/functions");

const SYSTEM_PROMPT = `You are an opportunity researcher for African and Ghanaian applicants worldwide. Search the web for real, currently open opportunities and return them as structured data.

STRICT RULES:
- Every opportunity must come from a DIFFERENT organisation — never repeat the same organisation or job title.
- Each link must go DIRECTLY to that specific opportunity's own application or information page — never link to a job board homepage, category page, search results page, or aggregator (do not link to reliefweb.int/jobs, unjobnet.com, ngojobsinafrica.com, opportunitiesforafricans.com, or any similar aggregator listing page).
- Do NOT invent deadlines — use "Rolling" or "TBD" if unsure.
- Return ONLY a raw JSON array — no markdown, no code fences, no explanation.
- Classify type ACCURATELY:
  * "fully-funded" = scholarship or fellowship covering tuition and/or living costs
  * "partial" = scholarship covering only some costs
  * "paid-internship" = short-term learning placement with a stipend
  * "unpaid-internship" = short-term learning placement with no pay
  * NEVER label a permanent job, consultancy, or remote professional role as "paid-internship"
- Classify job_type ACCURATELY:
  * "remote" = can be done from anywhere
  * "permanent" = full-time employed position
  * "contract" = fixed-term or consultancy role
  * "internship" = short-term learning placement only

Each item: { "id":"unique_string", "title":"program name", "type":"fully-funded|partial|paid-internship|unpaid-internship", "job_type":"remote|permanent|contract|internship", "organization":"org name", "destination":"country or Global", "field":"subject area", "level":"undergraduate|masters|phd|professional|all", "deadline":"YYYY-MM-DD or Rolling or TBD", "funding":"what is covered in one sentence", "link":"direct URL to this specific opportunity only", "description":"two sentences max" }`;

const handler = async () => {
  const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL   = process.env.SUPABASE_URL;
  const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;

  if (!ANTHROPIC_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing environment variables");
    return { statusCode: 500 };
  }

  try {
    const today = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
    const month = new Date().toLocaleString("en-US", { month:"long" });
    const year  = new Date().getFullYear();

    // ── Step 1: Call Claude with web search ──────────────────────────────────
    console.log("Fetching opportunities from Claude...");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        tools:      [{ type: "web_search_20250305", name: "web_search" }],
        system:     SYSTEM_PROMPT,
        messages:   [{
          role:    "user",
          content: `Today is ${today}. Search the web and find 10 real currently open opportunities for African and Ghanaian applicants in ${month} ${year}. Each must be from a different organisation. Include: 3-4 fully funded scholarships, 2-3 paid internships or fellowships, 2-3 remote or international professional jobs, and 1 volunteer opportunity. Return ONLY the JSON array.`
        }],
      }),
    });

    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const s = text.indexOf("["), e = text.lastIndexOf("]");
    if (s === -1 || e <= s) throw new Error("No JSON array in Claude response");

    const parsed = JSON.parse(text.slice(s, e + 1));
    if (!Array.isArray(parsed) || !parsed.length) throw new Error("Empty opportunities array");

    console.log(`Got ${parsed.length} opportunities from Claude`);

    // ── Step 2: Clear old opportunities ──────────────────────────────────────
    await fetch(`${SUPABASE_URL}/rest/v1/opportunities?id=not.is.null`, {
      method: "DELETE",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
      },
    });

    // ── Step 3: Insert fresh opportunities ───────────────────────────────────
    const rows = parsed.map((o, i) => ({
      id:           o.id || `opp_${Date.now()}_${i}`,
      title:        o.title        || "",
      type:         o.type         || "fully-funded",
      job_type:     o.job_type     || "permanent",
      organization: o.organization || "",
      destination:  o.destination  || "Global",
      field:        o.field        || "",
      level:        o.level        || "all",
      deadline:     o.deadline     || "TBD",
      funding:      o.funding      || "",
      link:         o.link         || "",
      description:  o.description  || "",
    }));

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/opportunities`, {
      method: "POST",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      throw new Error(`Supabase insert failed: ${err}`);
    }

    console.log(`Saved ${rows.length} opportunities to Supabase`);
    return { statusCode: 200 };

  } catch (err) {
    console.error("fetch-opportunities error:", err.message);
    return { statusCode: 500 };
  }
};

exports.handler = schedule("*/30 * * * *", handler);
