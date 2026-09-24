// Proxy for TheCocktailDB search, so the API key never reaches the browser.
// The key comes from the COCKTAILDB_API_KEY environment variable: set it in
// the Vercel project settings, and see .env.example for local development.

const MAX_QUERY_LENGTH = 64;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // No fallback to the public test key: a deploy missing the variable should
  // fail visibly rather than quietly run on a key meant for development.
  const key = process.env.COCKTAILDB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "COCKTAILDB_API_KEY is not configured" });
  }

  const query = typeof req.query.s === "string" ? req.query.s.trim().toLowerCase() : "";
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Expected ?s= with 1 to ${MAX_QUERY_LENGTH} characters` });
  }

  // The public test key "1" is served under v1; premium keys under v2.
  const version = key === "1" ? "v1" : "v2";
  const upstream =
    `https://www.thecocktaildb.com/api/json/${version}/${encodeURIComponent(key)}` +
    `/search.php?s=${encodeURIComponent(query)}`;

  let data;
  try {
    const response = await fetch(upstream);
    if (!response.ok) {
      return res.status(502).json({ error: `TheCocktailDB answered ${response.status}` });
    }
    data = await response.json();
  } catch {
    return res.status(502).json({ error: "Could not reach TheCocktailDB" });
  }

  // Cached at Vercel's edge for a day, and served stale for a week while it
  // refreshes, so repeat searches spend neither a function run nor API quota.
  // Errors above are never cached.
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ drinks: Array.isArray(data?.drinks) ? data.drinks : null });
}
