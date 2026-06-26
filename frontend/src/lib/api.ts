/**
 * API Base URL configuration
 *
 * With Next.js rewrites configured in next.config.js, all backend routes
 * are proxied through the Next.js server — eliminating CORS issues.
 *
 * The API constant will be an empty string when NEXT_PUBLIC_API_URL is not set,
 * which means all fetch calls become relative (e.g. '/api/journal-entries')
 * and are intercepted by Next.js rewrites.
 */
export const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
