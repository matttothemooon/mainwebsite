// profile-route.js
// Mount in your admin backend:
//   const profileRouter = require("./profile-route");
//   app.use("/api/profile", profileRouter);

const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();
const DATA_FILE = path.join(__dirname, "data", "profile.json");

const DEFAULT_PROFILE = {
  bio: "community mod & streamer.",
  links: [
    { label: "twitch", url: "https://twitch.tv/mattothemoon" },
    { label: "x", url: "https://x.com/mattothemoon" },
    { label: "github", url: "https://github.com/mattothemoon" },
    { label: "discord", url: "/discord" },
    { label: "discord profile", url: "https://discord.com/users/436300903927119873" },
    { label: "email", url: "mailto:mattothemoon06@gmail.com" },
  ],
  modExperience: {
    active: [
      { role: "Admin", name: "ChubsC", url: "https://twitch.tv/chubsc", date: "present" },
      { role: "CM", name: "Sinnski", url: "https://twitch.tv/sinnski", date: "present" },
      { role: "Admin", name: "TenacityTV", url: "https://twitch.tv/tenacitytv", date: "present" },
      { role: "Mod", name: "Cizzorz", url: "https://twitch.tv/cizzorz", date: "present" },
    ],
    past: [
      { role: "Head Mod", name: "Flynn", date: "Oct 2021 – Jan 2025" },
      { role: "Community Manager", name: "The Reapers", date: "Jun 2019 – Jan 2025" },
    ],
  },
};

async function readProfile() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2));
      return DEFAULT_PROFILE;
    }
    throw err;
  }
}

function requireAdminAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}

// Public — the live site fetches this
router.get("/", async (req, res) => {
  try {
    res.json(await readProfile());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read profile" });
  }
});

// Protected — admin panel writes here (GitHub-login session)
router.put("/", requireAdminAuth, async (req, res) => {
  const { bio, links, modExperience } = req.body;

  if (typeof bio !== "string" || !Array.isArray(links) || !modExperience) {
    return res.status(400).json({ error: "Invalid profile payload" });
  }

  const updated = { bio, links, modExperience };

  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

module.exports = router;
