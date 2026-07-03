/**
 * Timestamp formatting for the shared inline stamp format.
 *
 * Pure: takes a `Date` and returns an ISO 8601 *local* datetime at minute
 * precision (`YYYY-MM-DDTHH:mm`, no timezone offset), matching the PRD's
 * Timestamps decision. Injecting the `Date` (rather than reading the clock
 * inside the core) keeps selection/stamping deterministic under test, the same
 * way `selectWinner` takes its landing offset as a parameter.
 */
export function formatLocalDateTime(date: Date): string {
	const pad = (n: number): string => String(n).padStart(2, '0');
	const y = date.getFullYear();
	const mo = pad(date.getMonth() + 1);
	const d = pad(date.getDate());
	const h = pad(date.getHours());
	const mi = pad(date.getMinutes());
	return `${y}-${mo}-${d}T${h}:${mi}`;
}
