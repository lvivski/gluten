require('es6-promise').polyfill();

var fs = require('fs'),
	path = require('path');

var browserify = require('browserify'),
	watchify = require('watchify'),
	babelify = require('babelify'),
	envify = require('envify'),
	browserifyShim = require('browserify-shim'),
	bundleCollapser = require('bundle-collapser/plugin');

var	postcss = require('postcss'),
	chokidar = require('chokidar'),
	autoprefixer = require('autoprefixer'),
	postcssCalc = require('postcss-calc'),
	postcssCustomProperties = require('postcss-custom-properties'),
	postcssImport = require('postcss-import'),
	postcssNested = require('postcss-nested'),
	postcssUrl = require('postcss-url');

var colors = require('colors');
colors.setTheme({
	file: 'gray',
	info: 'cyan',
	built: 'green',
	error: 'red'
});

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
		watcher.on('update', function (files) {
			files.forEach(changed);
			watcher
				.bundle(built('JS'))
				.on('error', error)
				.pipe(fs.createWriteStream(path.resolve(process.cwd(), options.output)));
		});
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
		.plugin(bundleCollapser)
		.bundle(built('JS'))
		.on('error', error)
		.pipe(fs.createWriteStream(absolute(options.output)));
};

exports.css = function (options) {
	options = options || {};

	var watchedFiles = [],
		postcssWatch = function () {};

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
					'IE 8'
				]
			})
		])
		.use(postcssUrl({
			url: 'copy',
			useHash: true,
			assetsPath: options.assets
		}));

	processFiles(processor, options);
};

function relative(file) {
	return path.relative(process.cwd(), file);
}

function absolute(file) {
	return path.resolve(process.cwd(), file);
}

function changed(file) {
	console.log('Changed: '.info + relative(file).file);
}

function built(file) {
	return function () {
		console.log('Built: '.built + file.file);
	}
}

function error(error) {
	console.log('Error: '.red);
	console.log(error.codeFrame);
}

function processFiles(processor, options) {
	var css = fs.readFileSync(options.entry, "utf8");

	processor
		.process(css, {from: options.entry, to: options.output})
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
