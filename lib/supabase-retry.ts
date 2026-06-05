const RETRYABLE_CODES = new Set([503, 504, 429]);
const RETRYABLE_MESSAGES = ["connection", "timeout", "network", "ECONNRESET", "ETIMEDOUT"];

function isRetryable(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const e = error as Record<string, unknown>;
    if (typeof e.code === "number" && RETRYABLE_CODES.has(e.code)) return true;
    const msg = String(e.message ?? e.hint ?? "").toLowerCase();
    return RETRYABLE_MESSAGES.some((s) => msg.includes(s));
}

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
    fn: () => Promise<{ data: T | null; error: unknown }>,
    maxAttempts = 3,
    baseDelayMs = 300
): Promise<{ data: T | null; error: unknown }> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await fn();
        if (!result.error || !isRetryable(result.error)) return result;
        lastError = result.error;
        if (attempt < maxAttempts - 1) {
            await sleep(baseDelayMs * Math.pow(2, attempt));
        }
    }
    return { data: null, error: lastError };
}
