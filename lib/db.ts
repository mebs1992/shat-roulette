import { getCloudflareContext } from "@opennextjs/cloudflare";
// Imported as a type rather than pulling in the whole workers-types global set,
// which would collide with the DOM lib the app is built against.
import type { D1Database } from "@cloudflare/workers-types";

export type Env = {
  DB: D1Database;
  LOBBY_TICKET_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

/** The D1 binding, in both `next dev` and the deployed Worker. */
export async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as Env).DB;
}

export async function env(): Promise<Env> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Env;
}
