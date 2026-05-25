// utils/getRealIP.js
const getRealIP = (req) => {
    // Check for Cloudflare's CF-Connecting-IP header
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP) return cfConnectingIP;

    // Check for X-Forwarded-For header (when behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // Get the first IP from the list (original client IP)
        const ips = forwarded.split(',');
        return ips[0].trim();
    }

    // Check for X-Real-IP header
    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;

    // Check for X-Client-IP header
    const clientIP = req.headers['x-client-ip'];
    if (clientIP) return clientIP;

    // Fallback to remoteAddress
    let remoteAddress = req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip;

    // Remove IPv6 localhost prefix if present
    if (remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1') {
        remoteAddress = '127.0.0.1';
    }

    // Remove IPv6 prefix if present
    if (remoteAddress && remoteAddress.startsWith('::ffff:')) {
        remoteAddress = remoteAddress.substring(7);
    }

    return remoteAddress;
};

module.exports = getRealIP;