// Re-checks gear photos for the admin panel: confirms existing photos still
// load and looks up a photo from the product link for any that are missing or
// broken. Nothing is saved here; the admin panel applies the results and the
// owner saves as usual.
import { requireAuth } from "@/lib/auth";
import { findProductImage, imageStillWorks } from "@/lib/productImage";

const MAX_ITEMS = 100;
const CONCURRENCY = 6;

async function checkItem({ url, imageUrl }) {
  if (imageUrl && (await imageStillWorks(imageUrl))) return { status: "ok" };
  const found = url ? await findProductImage(url, { fresh: true }) : null;
  if (found && found !== imageUrl && (await imageStillWorks(found))) {
    return { status: imageUrl ? "replaced" : "found", imageUrl: found };
  }
  return { status: imageUrl ? "broken" : "missing" };
}

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let items;
  try {
    ({ items } = await request.json());
    if (!Array.isArray(items)) throw new Error();
  } catch {
    return Response.json({ error: "Expected { items: [...] }" }, { status: 400 });
  }
  items = items.slice(0, MAX_ITEMS).map((i) => ({
    key: String(i?.key ?? ""),
    url: typeof i?.url === "string" ? i.url : "",
    imageUrl: typeof i?.imageUrl === "string" ? i.imageUrl : "",
  }));

  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = { key: items[i].key, ...(await checkItem(items[i])) };
      }
    })
  );
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
