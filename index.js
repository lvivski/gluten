var browserify = require('browserify'),
    browserifyShim = require('browserify-shim'),
    partialify = require('partialify'),

    rework = require('rework'),
    reworkNpm = require('rework-npm'),
    prefixes = require('autoprefixer')().rework,
    vars = require('rework-vars')(),
    calc = require('rework-calc'),
    color = require('rework-color-function'),

    fs = require('fs'),
    path = require('path'),
    Davy = require('davy')

exports.js = function (options) {
	options = options || {}

	var shim = browserifyShim(browserify(), options.shim || {})
	shim.require(require.resolve(options.entry), {entry: true})
	shim.transform(partialify)

	return Davy.wrap(shim.bundle.bind(shim))({debug: false})
}

exports.css = function (options) {
	options = options || {}

	return Davy.wrap(fs.readFile)(options.entry, 'utf8').then(function (css) {
		return rework(css)
			.use(reworkNpm(path.dirname(options.entry)))
			.use(vars)
			.use(calc)
			.use(color)
			.use(prefixes)
			.toString()
	})
}
