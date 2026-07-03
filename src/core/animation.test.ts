import { describe, it, expect } from 'vitest';
import {
	FLOURISH_MS,
	FLOURISH_PULSES,
	FULL_LOOPS,
	SPIN_MS,
	planHops,
} from './animation';

const candidateSeq = (n: number, offset: number) =>
	planHops(n, offset).hops.map((h) => h.candidateIndex);

const isNonDecreasing = (xs: number[]) =>
	xs.every((x, i) => i === 0 || x >= xs[i - 1]!);

describe('planHops — multi-candidate spin', () => {
	it('lands the final hop on the drawn winner', () => {
		const plan = planHops(3, 2);
		expect(plan.winnerOffset).toBe(2);
		expect(plan.hops.at(-1)!.candidateIndex).toBe(2);
	});

	it('spins fullLoops complete loops then advances to the winner', () => {
		// Hop count is fullLoops*N + winnerOffset + 1 (the +1 is the starting
		// highlight), and the path cycles 0..N-1 the whole way.
		const plan = planHops(4, 1);
		expect(plan.hops).toHaveLength(FULL_LOOPS * 4 + 1 + 1);
		expect(candidateSeq(4, 1)).toEqual(
			Array.from({ length: FULL_LOOPS * 4 + 2 }, (_, i) => i % 4),
		);
	});

	it('reduces an out-of-range offset modulo the candidate count', () => {
		expect(planHops(3, 5).winnerOffset).toBe(2);
		expect(planHops(3, -1).winnerOffset).toBe(2);
	});

	it('decelerates: delays are non-decreasing and sum to the spin duration', () => {
		const { hops } = planHops(5, 3);
		const delays = hops.map((h) => h.delayMs);
		expect(isNonDecreasing(delays)).toBe(true);
		expect(delays[delays.length - 1]).toBeGreaterThan(delays[0]!);
		expect(delays.reduce((a, b) => a + b, 0)).toBe(SPIN_MS);
	});
});

describe('planHops — single candidate', () => {
	it('plays a short flourish on the sole candidate, not a full spin', () => {
		const plan = planHops(1, 0);
		expect(plan.winnerOffset).toBe(0);
		expect(plan.hops).toHaveLength(FLOURISH_PULSES);
		expect(plan.hops.every((h) => h.candidateIndex === 0)).toBe(true);
		expect(plan.hops.reduce((a, h) => a + h.delayMs, 0)).toBe(FLOURISH_MS);
	});
});

describe('planHops — guard', () => {
	it('throws when there are no candidates to hop over', () => {
		expect(() => planHops(0, 0)).toThrow(/no candidates/);
	});
});
