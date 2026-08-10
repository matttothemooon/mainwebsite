// api/links.js
import { getLinks } from "../lib/storage.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  const links = await getLinks();
  res.status(200).json(links);
}
