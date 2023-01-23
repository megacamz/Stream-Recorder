import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default [
	{
		input: 'src/content_scripts/worker/live-recorder-worker.js',
		output: {
			name: 'worker',
			format: 'umd', //?
			file: 'live-recorder-worker-bundle.js'
		},
		plugins: [
			resolve({
				jsnext: true,
				browser: true
			})
		]
	},
	{
		input: 'src/content_scripts/main.js',
		output: {
			name: 'bundle',
			format: 'umd',
			file: 'bundle.js',
			sourcemap: true
		},
		plugins: [
			resolve({
				jsnext: true,
				browser: true,
				main: true
			}),
			commonjs({
				include: 'node_modules/minimal-timer/index.js'
			})
		]
	}
]

