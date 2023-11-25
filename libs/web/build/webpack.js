const path = require('path');
const webpack = require('webpack');

const packageJSON = require('../package.json');

module.exports = function (isDev) {
	return [
		createConfig(isDev)
	]
};

function createConfig(isDev) {
	const version = packageJSON.version
	let config = {
		mode: isDev ? 'development' : 'production',
		entry: {
			index: path.join(__dirname, '../lib/index.ts')
		},
		// devtool: "inline-source-map",
		output: {
			path: path.join(__dirname, '../dist'),
			filename: '[name].js',
      library: 'bytes',
      globalObject: 'globalThis',
			libraryTarget: 'umd'
		},
		resolve: {
			extensions: ['.ts', '.js']
		},
		module: {
			rules: [
				{
					test: /\.(ts|js)$/,
					use: 'ts-loader'
				}
			]
		},
		plugins: [
			new webpack.DefinePlugin({
				PRODUCTION: JSON.stringify(!isDev),
				VERSION: JSON.stringify(isDev ? 'test' : version),
				BUILD_VERSION: JSON.stringify(getBuildVersion())
			}),
		]
	};

	if (isDev) {
		config.devServer = {
			contentBase: path.join(__dirname, '../'),
			compress: true,
			port: 8200,
			publicPath: '/devServer/',
			headers: {
				'Access-Control-Allow-Origin': '*'
			}
		};
		config.devtool = 'source-map';
	}

	return config;
}

function getBuildVersion() {
	let now = new Date();
	let yearStr = now.getFullYear().toString().slice(2, 4);
	let monthStr = paddingZero(now.getMonth() + 1);
	let dateStr = paddingZero(now.getDate());
	let hourStr = paddingZero(now.getHours());
	let minuteStr = paddingZero(now.getMinutes());
	let versionStr = `${yearStr}${monthStr}${dateStr}${hourStr}${minuteStr}`;
	return parseInt(versionStr, 10);
}

function paddingZero(num) {
	if (num < 10) {
		return `0${num}`;
	} else {
		return num.toString();
	}
}
