require('es6-promise').polyfill();

var fs = require('fs'),
	path = require('path');

var browserify = require('browserify'),
	watchify = require('watchify'),
	babelify = require('babelify'),
	envify = require('envify'),
	es3ify = require('es3ify'),
	browserifyShim = require('browserify-shim'),
	bundleCollapser = require('bundle-collapser/plugin');


var postcss = require('postcss'),
	chokidar = require('chokidar'),
	autoprefixer = require('autoprefixer'),
	postcssCalc = require('postcss-calc'),
	postcssCustomProperties = require('postcss-custom-properties'),
	postcssImport = require('postcss-import'),
	postcssNested = require('postcss-nested'),
	postcssUrl = require('postcss-url'),
	postcssReporter = require('postcss-reporter');
	
var babelPresetEs2015 = require('babel-preset-es2015-loose'),
	babelPresetReact = require('babel-preset-react'),
	babelPresetStage2 = require('babel-preset-stage-2');
	
var babelPluginReactTransform = require('babel-plugin-react-transform'),
	liveReactLoad = require('livereactload'),
	liveReactLoadBabelTransform = require('livereactload/babel-transform'),	

var colors = require('colors/safe');

exports.js = function (options) {
	options = options || {};

	if (options.hot) {
		options.watch = true;
		options.debug = true;	
	}

	if (options.watch) {
		assign(options, watchify.args);
	}

	options.builtins = false;
	options.detectGlobals = false;

	var bundler = browserify(options);
	if (options.watch) {
		var watcher = watchify(bundler);
		watcher.on('update', function (files) {
			files.forEach(changed);
			watcher
				.bundle(built('JS'))
				.on('error', errorLogger(false))
				.pipe(fs.createWriteStream(absolute(options.output)));
		});
	}
	
	var babelPlugins = [];
	if (options.hot) {
		babelPlugins.push([
			babelPluginReactTransform, 
			{
				transforms: [{
					transform: liveReactLoadBabelTransform,
					imports: ['react']
				}]
			}
		]);
		bundler.plugin(liveReactLoad);
	}
	
	bundler
		.transform(envify, {global: true})
		.transform(babelify.configure({
			presets: [
				babelPresetEs2015,
				babelPresetStage2,
				babelPresetReact,
			],
			plugins: babelPlugins, 
			ignore: /node_modules\/ws/,
			sourceMapRelative: '.'
		}), {global: true})
		.transform(es3ify, {global: true})

	if (options.shim) {
		bundler.transform(browserifyShim, {global: true});
	}
	
	if (!options.watch) {
		bundler.plugin(bundleCollapser)
	}

	bundler
		.require(absolute(options.entry), {entry: true})
		.bundle(built('JS'))
		.on('error', errorLogger(!options.watch))
		.pipe(fs.createWriteStream(absolute(options.output)));
};

exports.css = function (options) {
	options = options || {};

	var watchedFiles = [],
		postcssWatch = function () {};

	if (options.hot) {
		options.watch = true;
		options.debug = true;	
	}

	if (options.watch) {
		var watcher = chokidar.watch(watchedFiles);

		watcher.on('change', function (file) {
			changed(file);
			processFiles(processor, options);
		});

		postcssWatch = function (files) {
			watcher.unwatch(watchedFiles);
			watcher.add(files);
			watchedFiles = files;
		};
	}

	var processor = postcss([
			postcssImport({
				onImport: postcssWatch
			}),
			postcssNested(),
			postcssCustomProperties(),
			postcssCalc(),
			autoprefixer({
				browsers: [
					'> 1%',
					'last 2 versions',
					'IE 8'
				]
			}),
			postcssUrl({
				url: 'copy',
				useHash: true,
				assetsPath: options.assets
			}),
			postcssReporter({
				formatter: function(input) {
					if (input.messages.length) {
						return colors.yellow('Warn: ') + colors.gray(input.source) + '\n' +
							input.messages.map(function (message) {
								return ' ' + colors.yellow(message.plugin) + ' ' + message.text;
							}).join('\n');
					}
					return ''
				}
			})
		]);

	processFiles(processor, options);
};

function relative(file) {
	return path.relative(process.cwd(), file);
}

function absolute(file) {
	return path.resolve(process.cwd(), file);
}

function changed(file) {
	console.log(colors.cyan('Changed: ') + colors.gray(relative(file)));
}

function built(file) {
	return function () {
		console.log(colors.green('Built: ') + colors.gray(file));
	}
}

function errorLogger(exit) {
	return function (error) {
	   console.log(colors.red('Error: ') + (error.codeFrame || error));
	   if (exit) {
		   process.exit(1);
	   }
	}
}

function processFiles(processor, options) {
	var css = fs.readFileSync(options.entry, "utf8");
	var processorOptions = {from: options.entry, to: options.output};
	if (options.debug) {
		processorOptions.map = {inline: true};
	}
	processor
		.process(css,  processorOptions)
		.then(function (result) {
			built('CSS')();
			fs.writeFileSync(options.output, result.css);
		});
}

function assign(obj) {
	var i = 1;
	while (i < arguments.length) {
		var source = arguments[i++];
		for (var property in source) if (source.hasOwnProperty(property)) {
			obj[property] = source[property];
		}
	}
	return obj;
}
