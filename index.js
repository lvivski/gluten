require('es6-promise').polyfill();

var fs = require('fs'),
	path = require('path'),

	browserify = require('browserify'),
	watchify = require('watchify'),
	babelify = require('babelify'),
	envify = require('envify'),
	browserifyShim = require('browserify-shim'),

	postcss = require('postcss'),
	chokidar = require('chokidar'),
	autoprefixer = require('autoprefixer'),
	postcssCalc = require('postcss-calc'),
	postcssCustomProperties = require('postcss-custom-properties'),
	postcssImport = require('postcss-import'),
	postcssNested = require('postcss-nested'),
	postcssUrl = require('postcss-url');

exports.js = function (options) {
	options = options || {};

	if (process.env.NODE_ENV === 'development') {
		options.debug = true;
	}
	if (options.watch) {
		assign(options, watchify.args);
	}

	var bundler = browserify(options);

	if (options.watch) {
		var watcher = watchify(bundler);
		watcher.on('update', function () {
			watcher
				.bundle(function () {
					console.log('js changed');
				})
				.pipe(fs.createWriteStream(path.resolve(process.cwd(), options.output)))
		})
	}

	bundler
		.add(path.resolve(process.cwd(), options.entry))
		.transform(babelify.configure({
			loose: ['es6.modules'],
			sourceMapRelative: '.'
		}));

	if (options.shim) {
		bundler.transform(browserifyShim);
	}

	bundler
		.transform(envify)
		.bundle(function () {
			console.log('js build');
		})
		.pipe(fs.createWriteStream(path.resolve(process.cwd(), options.output)));
};

exports.css = function (options) {
	options = options || {};

	var watchedFiles = [],
		postcssWatch = function () {};

	if (options.watch) {
		var watcher = chokidar.watch(watchedFiles);

		watcher.on('change', function () {
			console.log('css changed');
			processFiles(processor, options);
		});

		postcssWatch = function (files) {
			watcher.unwatch(watchedFiles);
			watcher.add(files);
			watchedFiles = files;
		}
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
					'IE 8'
				]
			})
		])
		.use(postcssUrl({
			url: 'copy',
			useHash: true,
			assetsPath: 'assets'
		}));

	processFiles(processor, options);
};

function processFiles(processor, options) {
	var css = fs.readFileSync(options.entry, "utf8");

	processor
		.process(css, {from: options.entry, to: options.output})
		.then(function (result) {
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
