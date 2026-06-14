import { createHash } from "crypto";

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalRateLimitStore = globalThis as typeof globalThis & {
    __stgRateLimitStore?: RateLimitStore;
};

const rateLimitStore =
    globalRateLimitStore.__stgRateLimitStore ??
    (globalRateLimitStore.__stgRateLimitStore = new Map());

export function getClientIp(req: Request) {
    const forwarded = req.headers.get("x-forwarded-for");
    return (
        forwarded?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip")?.trim() ||
        "unknown"
    );
}

export function rateLimitKey(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

export function consumeRateLimit(
    key: string,
    options: { limit: number; windowMs: number }
) {
    const now = Date.now();

    // Keep the process-local fallback bounded during long-running instances.
    if (rateLimitStore.size > 5_000) {
        for (const [storedKey, entry] of rateLimitStore) {
            if (entry.resetAt <= now) rateLimitStore.delete(storedKey);
        }
    }

    const existing = rateLimitStore.get(key);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + options.windowMs;
        rateLimitStore.set(key, { count: 1, resetAt });
        return {
            allowed: true,
            remaining: Math.max(0, options.limit - 1),
            retryAfterSeconds: Math.ceil(options.windowMs / 1000),
        };
    }

    existing.count += 1;
    rateLimitStore.set(key, existing);

    return {
        allowed: existing.count <= options.limit,
        remaining: Math.max(0, options.limit - existing.count),
        retryAfterSeconds: Math.max(
            1,
            Math.ceil((existing.resetAt - now) / 1000)
        ),
    };
}

export function clearRateLimit(key: string) {
    rateLimitStore.delete(key);
}

export function isRequestBodyTooLarge(req: Request, maxBytes = 16_384) {
    const rawLength = req.headers.get("content-length");
    if (!rawLength) return false;

    const length = Number(rawLength);
    return Number.isFinite(length) && length > maxBytes;
}

export function sanitizePlainText(value: unknown, maxLength = 500) {
    return String(value ?? "")
        .normalize("NFKC")
        .replace(/<[^>]*>/g, " ")
        .replace(/[<>]/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

export function sanitizeSearchTerm(value: unknown, maxLength = 80) {
    return sanitizePlainText(value, maxLength)
        .replace(/[(),:"\\]/g, "")
        .trim();
}

export function looksLikeXssAttempt(value: unknown) {
    const input = String(value ?? "");
    return /<\s*\/?\s*[a-z][^>]*>|javascript\s*:|on(?:error|load|click|focus)\s*=/i.test(
        input
    );
}

export function normalizeLoginIdentifier(value: unknown, maxLength = 100) {
    return sanitizePlainText(value, maxLength);
}
