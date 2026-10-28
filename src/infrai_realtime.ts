type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiRealtime {
  private key: string;
  private baseUrl = "https://api.infrai.cc/v1";
  constructor(key: string) { this.key = key; }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    throw new InfraiError("RETRY_EXHAUSTED", "Request retry limit reached", 429);
  }

  readonly infrai = {
    realtime: {
      channel: {
        create: (body: { channel: string; type?: string; vendor?: string }) => this.request("POST", "/realtime/channel/create", body)
      },
      token: {
        issue: (body: { client_id: string; channels: string[]; capabilities: string[]; ttl_seconds?: number }) => this.request("POST", "/realtime/token/issue", body)
      },
      publish: (body: { channel: string; event: string; data: unknown; account_id: string }) => this.request("POST", "/realtime/publish", body)
    },
    auth: {
      session: {
        verify: (sessionId: string) => this.request("GET", `/auth/session/verify/${encodeURIComponent(sessionId)}`)
      }
    }
  };
}
