var browserify = require('browserify'),

	rework = require('rework'),
	reworkNpm = require('rework-npm'),
	prefixes = require('autoprefixer'),
	inherit = require('revork-inherit'),
	vars = require('rework-vars'),
	calc = require('rework-calc'),
	color = require('rework-color-function'),

	fs = require('fs'),
	path = require('path'),
	Davy = require('davy')

exports.js = function (options) {
	options = options || {}

	var b = browserify({
		basedir: options.basedir
	})

	b.require('./' + options.entry, {entry: true})

	return Davy.wrap(b.bundle.bind(b))({debug: false})
}

exports.css = function (options) {
	options = options || {}

	return Davy.wrap(fs.readFile)(options.entry, 'utf8').then(function (css) {
		return rework(css)
			.use(reworkNpm(path.dirname(options.entry)))
			.use(vars())
			.use(calc)
			.use(color)
			.use(inherit())
			.use(prefixes().rework)
			.toString()
	})
}

exports.files = function (options) {
	options = options || {}

	options.files.forEach(function (entry) {
		fs.createReadStream(entry).pipe(fs.createWriteStream(entry));
	})
}
