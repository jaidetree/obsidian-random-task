import { describe, it, expect } from 'vitest';
import { formatLocalDateTime } from './datetime';

describe('formatLocalDateTime', () => {
	it('formats as local YYYY-MM-DDTHH:mm with zero-padding', () => {
		// Local-time constructor, so no timezone skew in the assertion.
		expect(formatLocalDateTime(new Date(2026, 6, 3, 9, 5))).toBe(
			'2026-07-03T09:05',
		);
	});

	it('pads two-digit month, day, hour, and minute', () => {
		expect(formatLocalDateTime(new Date(2026, 10, 12, 23, 59))).toBe(
			'2026-11-12T23:59',
		);
	});

	it('drops seconds and timezone offset (minute precision only)', () => {
		expect(formatLocalDateTime(new Date(2026, 0, 1, 0, 0, 42))).toBe(
			'2026-01-01T00:00',
		);
	});
});
