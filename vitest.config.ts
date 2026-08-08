import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['src/**/*.test.ts'],
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
		},
	},
});
