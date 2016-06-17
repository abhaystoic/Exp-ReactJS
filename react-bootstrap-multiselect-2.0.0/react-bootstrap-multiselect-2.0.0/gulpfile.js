'use strict';

var gulp = require('gulp');
var browserify = require('gulp-browserify');
var cssmin = require('gulp-cssmin');
var download = require('gulp-download');
var exec = require('child_process').exec;
var less = require('gulp-less');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var connect = require('gulp-connect');
var react = require('gulp-react');
var replace = require('gulp-replace');
var fs = require('fs');
var wrap = require('gulp-wrap');

var port = 8080;

// this task downloads the lastest .js and .less from the 'parent'
// library that we are wrapping for react
gulp.task('download', function () {
	// download the .js file
	download('https://raw.githubusercontent.com/davidstutz/bootstrap-multiselect/master/dist/js/bootstrap-multiselect.js')
		.pipe(rename('bootstrap-multiselect-original.js'))
		.pipe(gulp.dest('./lib/'));
	// download the .less file
	download('https://raw.githubusercontent.com/davidstutz/bootstrap-multiselect/master/dist/less/bootstrap-multiselect.less')
		.pipe(gulp.dest('./less/'));
	// download the .css file
	download('https://raw.githubusercontent.com/davidstutz/bootstrap-multiselect/master/dist/css/bootstrap-multiselect.css')
		.pipe(gulp.dest('./css/'));
});

gulp.task('get-options', function () {
	// fake jQuery
	var jQuery = function() {};
	jQuery.fn = {};

	// init
	var $ = require('./lib/bootstrap-multiselect.js').init(jQuery);

	// get default plugin options
	var options = Object.keys($.fn.multiselect.prototype.constructor.Constructor.prototype.defaults).sort();

	fs.writeFile('./lib/get-options.js', [
		'/* generated by gulpfile.js */',
		'module.exports = exports = function () {',
		'\treturn ' + JSON.stringify(options, null, '\t\t') + ';',
		'};'
	].join('\n'), 'utf-8');
});

gulp.task('bootstrap-dropdown', function () {
	gulp.src('./node_modules/bootstrap/js/dropdown.js')
		.pipe(wrap('exports.init = function (jQuery) {\nif (jQuery.fn.dropdown) return jQuery;\n<%= contents %>\nreturn jQuery;\n};'))
		.pipe(rename('bootstrap-dropdown.js'))
		.pipe(gulp.dest('./lib'));
});

gulp.task('bootstrap-multiselect', function () {
	gulp.src('./lib/bootstrap-multiselect-original.js')
		.pipe(wrap('exports.init = function (jQuery) {\nif (jQuery.fn.multiselect) return jQuery;\n<%= contents %>\nreturn jQuery;\n};'))
		.pipe(replace('window.jQuery', 'jQuery'))
		.pipe(rename('bootstrap-multiselect.js'))
		.pipe(gulp.dest('./lib'));
});


gulp.task('lint', function () {
	exec([
			'node',
			'./node_modules/jsxhint/cli.js',
			//'--show-non-errors',
			'--config',
			'./.jshint',
			'./gulpfile.js ./lib/index.js ./demo/src/*.js'
		].join(' '),
	function (err, stdout, stderr) {
		if (stdout) {
			console.log(stdout);
		}
	});
});

gulp.task('fonts', function () {
	gulp.src('./node_modules/bootstrap/dist/fonts/*')
		.pipe(gulp.dest('./demo/www/fonts/'));
});

gulp.task('app-content', function () {
	var content = fs.readFileSync('./demo/src/App.js', 'utf-8');
	fs.writeFileSync(
		'./demo/src/AppContent.js',
		[
			'/* autogenerated by gulpfile.js */',
			'exports.content = ' + JSON.stringify(content) + ';'
		].join('\n'),
		'utf-8'
	);
});

gulp.task('demo', function () {
	var buildStyles = function (name) {
		gulp.src('./demo/src/less/' + name + '.less')
			.pipe(less())
			.pipe(rename(name + '.debug.css'))
			.pipe(gulp.dest('./demo/www/css/'))
			.pipe(cssmin())
			.pipe(rename(name + '.min.css'))
			.pipe(gulp.dest('./demo/www/css/'));
	};
	// styles
	buildStyles('demo');
	buildStyles('bootstrap-multiselect');

	// scripts
	gulp.src('./demo/src/App.js')
		.pipe(browserify({
			debug: true,
			transform: ['reactify']
		}))
		.pipe(rename('demo.debug.js'))
		.pipe(gulp.dest('./demo/www/js/'))
		.pipe(uglify())
		.pipe(rename('demo.min.js'))
		.pipe(gulp.dest('./demo/www/js/'));
});

gulp.task('server', function() {
	connect.server({
		root: './demo/www',
		livereload: true,
		port: 8080
	});
});

gulp.task('watch', function () {
	gulp.watch(['./gulpfile.js', './lib/**/*.js','./demo/src/**/*.js'], ['build']);
});

gulp.task('update', ['download', 'get-options']);
gulp.task('build', ['lint', 'fonts', 'app-content', 'demo']);
gulp.task('default', ['bootstrap-dropdown', 'bootstrap-multiselect', 'build', 'server', 'watch']);

//handle errors
process.on('uncaughtException', function (e) {
	console.error(e);
});