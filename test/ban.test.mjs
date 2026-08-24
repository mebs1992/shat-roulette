/**
 * Auto-ban after three DISTINCT reports — the exact SQL the lobby's
 * recordReport runs, against one database.
 *
 *   npm run test:ban   (no server needed; uses the local D1 directly)
 *
 * In production the lobby and app bind the same database_id, so the lobby's
 * writes and the app's banned_at reads share one database. This proves the
 * logic: dedup per reporter, the threshold, and that reporters are unaffected.
 * Enforcement (a banned account is refused a ticket) is covered by test:ban-live.
 */
import { execFileSync } from "node:child_process";

let pass = 0, fail = 0;
const check = (l, ok, d = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${d ? " — " + d : ""}`); };

function sql(command) {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "shat-roulette", "--local", "--json", "--command", command], { encoding: "utf8" });
  return JSON.parse(out)[0].results;
}

const tag = Date.now().toString(36);
const mk = (name) => {
  const id = `ban_${tag}_${name}`;
  sql(`INSERT INTO users (id, username, shitmate_num, email, created_at) VALUES ('${id}', '${id}', ${Math.floor(Math.random() * 89999) + 10000}, '${id}@e.com', ${Date.now()})`);
  return id;
};

// Exactly what the lobby's recordReport does.
function report(reporter, reported) {
  sql(`INSERT OR IGNORE INTO reports (reporter_id, reported_id, created_at) VALUES ('${reporter}', '${reported}', ${Date.now()})`);
  const n = sql(`SELECT COUNT(*) AS n FROM reports WHERE reported_id = '${reported}'`)[0].n;
  if (n >= 3) sql(`UPDATE users SET banned_at = ${Date.now()} WHERE id = '${reported}' AND banned_at IS NULL`);
}
const banned = (id) => sql(`SELECT banned_at FROM users WHERE id = '${id}'`)[0].banned_at != null;

console.log("\nAuto-ban logic");
const victim = mk("victim");
const a = mk("a"), b = mk("b"), c = mk("c");

report(a, victim);
report(b, victim);
check("two distinct reports do NOT ban", !banned(victim));

report(a, victim); // same reporter again
check("the same reporter twice counts once", !banned(victim));
check("still only two distinct reports on record", sql(`SELECT COUNT(*) AS n FROM reports WHERE reported_id='${victim}'`)[0].n === 2);

report(c, victim); // third DISTINCT
check("three distinct reporters BAN", banned(victim));
check("a reporter is never banned themselves", !banned(a));

// clean up
sql(`DELETE FROM users WHERE id LIKE 'ban_${tag}_%'`);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
