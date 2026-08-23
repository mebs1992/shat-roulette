var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/protocol.ts
var MAX_MESSAGE_LENGTH = 500;
var RATE_LIMIT = 12;
var RATE_WINDOW_MS = 1e4;

// worker/index.ts
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const id = env.LOBBY.idFromName("global");
      return env.LOBBY.get(id).fetch(request);
    }
    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "content-type": "text/plain" } });
    }
    return new Response("Not found", { status: 404 });
  }
};
var Lobby = class {
  static {
    __name(this, "Lobby");
  }
  clients = /* @__PURE__ */ new Set();
  /** Kept only so a report can carry context. Dropped when the pair ends. */
  transcripts = /* @__PURE__ */ new WeakMap();
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [clientSide, serverSide] = Object.values(pair);
    serverSide.accept();
    const country = request.cf?.country ?? "??";
    const client = {
      socket: serverSide,
      deviceId: "",
      num: 1e4 + Math.floor(Math.random() * 89999),
      country,
      gender: "man",
      preference: "anyone",
      shitStartedAt: Date.now(),
      state: "idle",
      queuedAt: 0,
      partner: null,
      blocked: /* @__PURE__ */ new Set(),
      sentAt: []
    };
    this.clients.add(client);
    serverSide.addEventListener("message", (event) => {
      let parsed;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        this.send(client, { t: "error", code: "bad_message" });
        return;
      }
      this.handle(client, parsed);
    });
    const drop = /* @__PURE__ */ __name(() => this.disconnect(client), "drop");
    serverSide.addEventListener("close", drop);
    serverSide.addEventListener("error", drop);
    this.send(client, {
      t: "welcome",
      num: client.num,
      country: client.country,
      online: this.clients.size,
      serverNow: Date.now()
    });
    this.broadcastOnline();
    return new Response(null, { status: 101, webSocket: clientSide });
  }
  handle(client, message) {
    switch (message.t) {
      case "hello": {
        client.deviceId = String(message.deviceId).slice(0, 64);
        client.gender = message.gender;
        client.preference = message.preference;
        client.shitStartedAt = Date.now();
        return;
      }
      case "queue": {
        if (client.state === "paired") this.partClient(client, "leave");
        client.state = "queued";
        client.queuedAt = Date.now();
        this.tryPair(client);
        this.broadcastWaiting();
        return;
      }
      case "cancel": {
        if (client.state === "queued") client.state = "idle";
        this.broadcastWaiting();
        return;
      }
      case "msg": {
        const partner = client.partner;
        if (client.state !== "paired" || !partner) {
          this.send(client, { t: "error", code: "not_paired" });
          return;
        }
        const text = String(message.text ?? "").trim();
        if (!text) return;
        if (text.length > MAX_MESSAGE_LENGTH) {
          this.send(client, { t: "error", code: "too_long" });
          return;
        }
        if (this.isRateLimited(client)) {
          this.send(client, { t: "error", code: "rate_limited" });
          return;
        }
        const at = Date.now();
        this.remember(client, partner, text);
        this.send(partner, { t: "msg", text, at });
        return;
      }
      case "typing": {
        if (client.partner) this.send(client.partner, { t: "typing", on: Boolean(message.on) });
        return;
      }
      case "leave": {
        this.partClient(client, "leave");
        return;
      }
      case "block": {
        const partner = client.partner;
        if (partner) {
          client.blocked.add(partner.deviceId);
          partner.blocked.add(client.deviceId);
        }
        this.partClient(client, "leave");
        return;
      }
      case "report": {
        const partner = client.partner;
        const transcript = partner ? this.transcripts.get(partner) ?? [] : [];
        console.log(
          JSON.stringify({
            kind: "REPORT",
            at: (/* @__PURE__ */ new Date()).toISOString(),
            reporter: client.num,
            reported: partner?.num ?? null,
            reportedCountry: partner?.country ?? null,
            reason: message.reason ?? null,
            context: transcript.slice(-20)
          })
        );
        if (partner) {
          client.blocked.add(partner.deviceId);
          partner.blocked.add(client.deviceId);
        }
        this.partClient(client, "leave");
        return;
      }
      default:
        this.send(client, { t: "error", code: "bad_message" });
    }
  }
  tryPair(client) {
    const waiting = [...this.clients].filter((c) => c !== client && c.state === "queued" && this.compatible(client, c)).sort((a, b) => a.queuedAt - b.queuedAt);
    const candidate = waiting[0];
    if (candidate) {
      client.state = candidate.state = "paired";
      client.partner = candidate;
      candidate.partner = client;
      this.transcripts.set(client, []);
      this.transcripts.set(candidate, []);
      const serverNow = Date.now();
      this.send(client, { t: "matched", partner: this.describe(candidate), serverNow });
      this.send(candidate, { t: "matched", partner: this.describe(client), serverNow });
    }
  }
  compatible(a, b) {
    if (a.deviceId && b.deviceId && a.deviceId === b.deviceId) return false;
    if (a.blocked.has(b.deviceId) || b.blocked.has(a.deviceId)) return false;
    const aWantsB = a.preference === "anyone" || a.preference === b.gender;
    const bWantsA = b.preference === "anyone" || b.preference === a.gender;
    return aWantsB && bWantsA;
  }
  describe(client) {
    return {
      num: client.num,
      country: client.country,
      gender: client.gender,
      shitStartedAt: client.shitStartedAt
    };
  }
  /** Unpair `client`, telling the other side why. */
  partClient(client, reason) {
    const partner = client.partner;
    client.partner = null;
    client.state = "idle";
    this.transcripts.delete(client);
    if (partner) {
      partner.partner = null;
      partner.state = "idle";
      this.transcripts.delete(partner);
      this.send(partner, { t: "left", reason });
    }
  }
  disconnect(client) {
    if (!this.clients.has(client)) return;
    this.partClient(client, "disconnect");
    this.clients.delete(client);
    this.broadcastOnline();
    this.broadcastWaiting();
  }
  isRateLimited(client) {
    const now = Date.now();
    client.sentAt = client.sentAt.filter((t) => now - t < RATE_WINDOW_MS);
    if (client.sentAt.length >= RATE_LIMIT) return true;
    client.sentAt.push(now);
    return false;
  }
  remember(from, to, text) {
    for (const side of [from, to]) {
      const log = this.transcripts.get(side);
      if (!log) continue;
      log.push({ from: String(from.num), text });
      if (log.length > 20) log.shift();
    }
  }
  send(client, message) {
    try {
      client.socket.send(JSON.stringify(message));
    } catch {
    }
  }
  broadcastOnline() {
    const count = this.clients.size;
    for (const client of this.clients) this.send(client, { t: "online", count });
  }
  broadcastWaiting() {
    let queued = 0;
    for (const client of this.clients) if (client.state === "queued") queued += 1;
    for (const client of this.clients) {
      if (client.state === "queued") this.send(client, { t: "waiting", queued });
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-LJk9S1/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-LJk9S1/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  Lobby,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
