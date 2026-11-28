import { getProfile } from "@/lib/storage";

const siteUrl = "https://mattothemoon.xyz";

export default async function sitemap() {
  const { pages = [] } = await getProfile({ fresh: true });
  const publishedPages = pages.filter((page) => page.published);

  return [
    { url: siteUrl, priority: 1 },
    { url: `${siteUrl}/what-i-use`, priority: 0.8 },
    { url: `${siteUrl}/work`, priority: 0.8 },
    { url: `${siteUrl}/guestbook`, priority: 0.5 },
    { url: `${siteUrl}/blocked-terms`, priority: 0.7 },
    { url: `${siteUrl}/commands`, priority: 0.7 },
    { url: `${siteUrl}/raffle`, priority: 0.7 },
    ...publishedPages.map((page) => ({
      url: `${siteUrl}/pages/${page.slug}`,
      priority: 0.7,
    })),
  ];
}
