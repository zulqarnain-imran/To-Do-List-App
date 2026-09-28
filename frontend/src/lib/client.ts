/**
 * Browser-side fetch wrapper.
 *
 * Every call funnels through here so that error messages, the offline banner
 * and JSON parsing behave identically everywhere.
 */

export class ClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClientError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};

  const response = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json" } : undefined,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    // Session lives in an HttpOnly cookie, so it must ride along.
    credentials: "same-origin",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new ClientError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
