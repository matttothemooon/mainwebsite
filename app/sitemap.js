import { getProfile } from "@/lib/storage";

const siteUrl = "https://mattothemoon.xyz";

export default async function sitemap() {
  const { pages = [] } = await getProfile({ fresh: true });
  const publishedPages = pages.filter((page) => page.published);

  return [
    { url: siteUrl, priority: 1 },
    { url: `${siteUrl}/pages`, priority: 0.8 },
    { url: `${siteUrl}/what-i-use`, priority: 0.8 },
    ...publishedPages.map((page) => ({
      url: `${siteUrl}/pages/${page.slug}`,
      priority: 0.7,
    })),
  ];
}
