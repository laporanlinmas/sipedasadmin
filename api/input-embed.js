export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  var target = process.env.INPUT_EMBED_URL || "";
  if (!target) {
    return res.status(500).send("INPUT_EMBED_URL is not configured");
  }

  // Endpoint internal; URL asli disimpan di env Vercel.
  return res.redirect(302, target);
}
