const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = __dirname;
const OUT = path.join(ROOT, "public");
const PAGES_DIR = path.join(ROOT, "content", "pages");
const UPLOADS_DIR = path.join(ROOT, "content", "uploads");
const TEMPLATE_PATH = path.join(ROOT, "templates", "page-template.html");

// Anything at repo root that should NOT be copied into the build output.
const EXCLUDE = new Set([
  "node_modules",
  ".git",
  "content",
  "templates",
  "public",
  "api",
  "build.js",
  "package.json",
  "package-lock.json",
  "vercel.json",
  "README.md",
  ".vercel",
]);

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function copyExistingSite() {
  for (const entry of fs.readdirSync(ROOT)) {
    if (EXCLUDE.has(entry)) continue;
    copyRecursive(path.join(ROOT, entry), path.join(OUT, entry));
  }
}

function copyUploads() {
  if (fs.existsSync(UPLOADS_DIR)) {
    copyRecursive(UPLOADS_DIR, path.join(OUT, "uploads"));
  }
}

function buildPages() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const navEntries = [];

  for (const file of fs.readdirSync(PAGES_DIR)) {
    if (!file.endsWith(".md")) continue;
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), "utf8");
    const { data, content } = matter(raw);

    const slug = (data.slug || file.replace(/\.md$/, "")).replace(/^\/|\/$/g, "");
    const title = data.title || slug;
    const description = data.description || "";
    const html = marked.parse(content);

    const page = template
      .split("{{TITLE}}").join(title)
      .split("{{DESCRIPTION}}").join(description)
      .split("{{CONTENT}}").join(html);

    const outPath = path.join(OUT, `${slug}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, page);
    console.log(`built /${slug}.html`);

    navEntries.push({ title, slug });
  }

  fs.writeFileSync(path.join(OUT, "pages.json"), JSON.stringify(navEntries));
  return navEntries;
}

rimraf(OUT);
fs.mkdirSync(OUT, { recursive: true });
copyExistingSite();
copyUploads();
buildPages();

console.log("build complete →", OUT);
