// Notifies search engines (Bing, Yandex, Seznam, Naver, etc. via IndexNow)
// that the site's pages are fresh so they get crawled/indexed quickly.
// The key below is public by design: it is also served at /<key>.txt.
export const INDEXNOW_KEY = "fcbc8f02ef202e8efd8ebee5ae1eecbc";

const PATHS = ["/", "/sitemap.xml"];

export async function pingSearchEngines(): Promise<string> {
  const siteUrl = (process.env.URL || "https://gilded-dieffenbachia-5177e7.netlify.app").replace(/\/$/, "");
  const host = new URL(siteUrl).host;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
      urlList: PATHS.map((p) => `${siteUrl}${p}`),
    }),
  });

  const msg = `IndexNow ping for ${host}: HTTP ${res.status}`;
  console.log(msg);
  return msg;
}
