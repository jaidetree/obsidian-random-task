import { defineConfig } from 'vitest/config';

// The pure core is string-in / string-out, so the unit seam needs no Obsidian
// runtime and no DOM — plain Node. Tests are co-located as `src/**/*.test.ts`.
// The E2E seam lives under `test/specs/*.e2e.ts` and is run by WebdriverIO, not
// vitest, so it is excluded here.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
