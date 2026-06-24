// netlify/functions/anthropic.js
// Generic Anthropic API proxy — keeps your API key secure server-side.
// Set ANTHROPIC_API_KEY in Netlify → Site Configuration → Environment Variables.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not set in environment variables." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "web-search-2025-03-05",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { statusCode: response.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
