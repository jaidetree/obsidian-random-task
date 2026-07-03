/**
 * Pure hop-plan for the Draw animation (ADR-0002). Turns the uniformly-drawn
 * winner offset into the ordered sequence of Candidate hops and their
 * decelerating delays — no CodeMirror, no timers, no rendering. The thin adapter
 * (`commands/draw.ts`) maps each `candidateIndex` to a document line, dispatches
 * the highlight, and sleeps `delayMs` between hops.
 *
 * Timing is fixed (not configurable in v1). Because E2E cannot assert on
 * animation frames, the hop count, landing, and deceleration are proven here at
 * the pure seam.
 */

/** How many full loops over the Candidates precede the landing hop. */
export const FULL_LOOPS = 3;
/** Total spin duration for a multi-Candidate draw (~2s per the PRD). */
export const SPIN_MS = 2000;
/** A single-Candidate draw skips the spin for a brief flourish instead. */
export const FLOURISH_PULSES = 4;
export const FLOURISH_MS = 700;

/** One highlight step: the Candidate to light up and the rest before the next. */
export interface Hop {
	candidateIndex: number;
	delayMs: number;
}

export interface HopPlan {
	hops: Hop[];
	/** The Candidate index the spin lands on; `hops` ends here. */
	winnerOffset: number;
}

/**
 * The hop sequence for a draw over `candidateCount` Candidates landing on
 * `offset`. The path visits `i % N` for `i` in `0..fullLoops*N + winnerOffset`,
 * so it spins `fullLoops` full loops then advances `winnerOffset` more to settle
 * on the winner. Delays ramp up linearly (later hops rest longer) so the spin
 * visibly decelerates, summing to the fixed duration. A single Candidate gets a
 * short flourish of pulses rather than a full — and pointless — spin.
 */
export function planHops(candidateCount: number, offset: number): HopPlan {
	if (candidateCount <= 0) throw new Error('planHops: no candidates');
	const winnerOffset = ((offset % candidateCount) + candidateCount) % candidateCount;

	if (candidateCount === 1) {
		return {
			winnerOffset: 0,
			hops: rampDelays(FLOURISH_PULSES, FLOURISH_MS).map((delayMs) => ({
				candidateIndex: 0,
				delayMs,
			})),
		};
	}

	const totalHops = FULL_LOOPS * candidateCount + winnerOffset + 1;
	const delays = rampDelays(totalHops, SPIN_MS);
	return {
		winnerOffset,
		hops: delays.map((delayMs, i) => ({
			candidateIndex: i % candidateCount,
			delayMs,
		})),
	};
}

/**
 * `count` delays that increase linearly and sum to `totalMs`, so successive hops
 * rest progressively longer (deceleration). Weight `i+1` gives strictly
 * increasing delays; the last absorbs any rounding drift so the sum is exact.
 */
function rampDelays(count: number, totalMs: number): number[] {
	const weightSum = (count * (count + 1)) / 2;
	const delays: number[] = [];
	let allocated = 0;
	for (let i = 0; i < count - 1; i++) {
		const d = Math.round((totalMs * (i + 1)) / weightSum);
		delays.push(d);
		allocated += d;
	}
	delays.push(totalMs - allocated);
	return delays;
}
