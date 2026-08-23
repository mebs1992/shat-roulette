/**
 * Creates the D1 database and writes its id into wrangler.jsonc.
 *
 *   npm run db:setup
 *
 * Safe to run twice: if the database already exists it just re-reads the id.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const NAME = "shat-roulette";
const CONFIG = "wrangler.jsonc";

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });
}

console.log(`Creating the "${NAME}" database…`);
try {
  wrangler(["d1", "create", NAME]);
  console.log("  created.");
} catch (error) {
  const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  if (/already exists/i.test(output)) {
    console.log("  already exists — reusing it.");
  } else {
    console.error(output.trim() || error.message);
    console.error("\nIf this says you are not logged in, run:  npx wrangler login");
    process.exit(1);
  }
}

let databases;
try {
  databases = JSON.parse(wrangler(["d1", "list", "--json"]));
} catch (error) {
  console.error(`Could not list databases: ${error.message}`);
  process.exit(1);
}

const found = databases.find((entry) => entry.name === NAME);
const id = found?.uuid ?? found?.id;
if (!id) {
  console.error(`Created it, but could not find "${NAME}" in the list. Check the Cloudflare dashboard.`);
  process.exit(1);
}

const config = readFileSync(CONFIG, "utf8");
if (config.includes(id)) {
  console.log(`\n${CONFIG} already points at ${id}.`);
} else {
  writeFileSync(CONFIG, config.replace(/("database_id":\s*)"[^"]*"/, `$1"${id}"`));
  console.log(`\nWrote the id into ${CONFIG}:\n  ${id}`);
}

console.log(`
Next:
  npm run db:migrate       create the tables in it
  git add ${CONFIG} && git commit -m "Add D1 database id" && git push
`);
