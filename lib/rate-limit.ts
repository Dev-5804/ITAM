const rateLimit = new Map<string, { count: number; expiresAt: number }>()

export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const record = rateLimit.get(ip)

    if (!record || record.expiresAt < now) {
        rateLimit.set(ip, { count: 1, expiresAt: now + windowMs })
        return true
    }

    if (record.count >= limit) {
        return false
    }

    record.count++
    return true
}
