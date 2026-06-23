const fs = require("fs");
const path = require("path");

const PLACEHOLDER_PATTERNS = ["your-project", "your_service_role", "your_gemini"];

function isUnset(value) {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((p) => trimmed.includes(p));
}

function parseEnvContent(content) {
  const parsed = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function findEnvFiles() {
  const roots = [...new Set([path.join(__dirname, ".."), process.cwd()])];
  const names = [".env.local", ".env"];
  const files = [];

  for (const root of roots) {
    for (const name of names) {
      const filePath = path.join(root, name);
      if (fs.existsSync(filePath)) files.push(filePath);
    }
  }

  return files;
}

function loadEnvFile() {
  const merged = {};

  for (const filePath of findEnvFiles()) {
    Object.assign(merged, parseEnvContent(fs.readFileSync(filePath, "utf8")));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (isUnset(process.env[key]) && !isUnset(value)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function normalizeSupabaseUrl(url) {
  if (!url) return url;
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function getMissingSupabaseEnv() {
  loadEnvFile();
  const missing = [];
  if (isUnset(process.env.SUPABASE_URL)) missing.push("SUPABASE_URL");
  if (isUnset(process.env.SUPABASE_SERVICE_ROLE_KEY)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

function getSupabaseConfig() {
  loadEnvFile();
  return {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

module.exports = { getMissingSupabaseEnv, getSupabaseConfig, loadEnvFile };
