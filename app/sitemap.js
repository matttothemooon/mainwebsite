import { getProfile } from "@/lib/storage";

const SITE = "https://mattothemoon.xyz";

export const revalidate = 3600;

export default async function sitemap() {
  let pages = [];
  try {
    ({ pages } = await getProfile());
  } catch {}
  return [
    { url: `${SITE}/`, priority: 1 },
    { url: `${SITE}/what-i-use` },
    { url: `${SITE}/pages` },
    ...pages
      .filter((p) => p.published && p.slug)
      .map((p) => ({ url: `${SITE}/pages/${p.slug}` })),
  ];
}
