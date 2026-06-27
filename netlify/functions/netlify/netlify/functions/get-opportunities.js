exports.handler = async () => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Supabase not configured" }) };
  }

  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/opportunities?select=*&order=fetched_at.desc`,
      {
        headers: {
          "apikey":        process.env.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
