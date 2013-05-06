/* jshint node:true */

var fs = require("fs");
var wrench = require("wrench");
var pages = require("./pages.js");
var globals = require("./globals.js");
var build = require("./build.js");
var cp = require("child_process");
var path = require("path");
var cwd = process.cwd();

//////////////////
// sharing data between the static client and the built site.
// the data gets pulled in here for generation of static pages
// and also gets required in the client-side code when rendering partial templates
var requirejs = require('requirejs');

var exec = function (exec, args, cwd, suppress, doneCB) {
	process.stdin.resume();

	var child = cp.spawn(exec, args || [], {
		cwd: cwd,
		env: null,
		setsid: true,
		stdio: (suppress) ? null : "inherit"
	});

	child.addListener("exit", function (code) {
		doneCB(!code);
	});
};

module.exports = {

	source_dir : "project", // `source_dir` is the directory where all your source files are.
	output_dir: "deploy", // `output_dir` is the directory you want to compile your static site to.
	gh_pages_dir : "gh-pages",

	template_engine : "swig", // the npm package name of the template engine, only engines supported by consolidate.js will work
	template_dir : "project/templates", // Only relevant if using swig : The directory where all your templates are.

	/*
		Literal regexes here. Statix won't include anything, unless it matches an `include_pattern` and also does
		not match an `exclude_pattern`. Checks against the full path, i.e. /Users/your.name/some/dir/site/blah.html
	*/

	include_patterns : [
		/^(.*)$/
	],

	exclude_patterns : [
		/^(.*)(base\.html{1})$/,
		/^(.*)(\/templates{1})(.*)$/,
		/^(.*)(\/source{1})(.*)$/
	],

	/*
		An array of the pages to be rendered with the template engine.

		`output` is where your page will eventually live, in the static version of the site. I.e. "{output_dir}/{page.output}"

		`source` is where your template lives. I.e. "{source_dir}{page.source}"

		`data` is an object of variables you want to pass through to the template when it gets rendered.
	*/

	pages : pages,

	/*
		`global_data` is an object that gets passed to all pages. Note, if you set `global_data.someProp` to something
		and also have `page.data.someProp`, the latter will take precedence.
	*/

	global_data: globals,

	/*
		Like `global_data`, but `build_data` only gets passed to the renderer when you build, not when viewing locally through the webserver.
		`build_data` properties take precedence over `global_data` properties.
	*/

	build_data : build,

	/*
		If you need to process some things before you're ready to generate the pages (either through the web server or compilation),
		you can use this `ready` method. Common use case, you need to grab a bunch of data from a database, and are using asynch i/o
		Statix, does nothing until the `callback` passed to this method is called, so once you are done with everything you need to do,
		simply call `callback();`
	*/

	ready : function (callback) {
		console.log("ready");

		var source = this.source_dir + "/static/js/",
			pages = this.pages,
			global = this.global_data;

		requirejs.config({
			nodeRequire: require,
			baseUrl : source,

			paths: {
				"jsonFile" : "./libs/plugins/amd/jsonFile",
				"text" : "./libs/plugins/amd/text"
			}
		});

		// apply data
		callback();
	},

	/*
		Statix gives you a hook to do whatever you want before the build actually happens. You can use this method to minify js/css,
		compile scss stylesheets, etc. Just be sure to invoke the `done()` function when you are ready for Statix to do it's thing.
	*/

	preBuild : function (done) {
		exec("grunt", ["build"], null, false, function (success) {
			if (success) {
				done();
			}
			else {
				console.log("");
				console.error("There was an error running grunt build...");
				console.log("");
				process.exit();
			}
		});
	},

	swigSettings : {
		cache: false
	},

	/*
		Just like `preBuild()` but this method gets called after Statix has generated the static site. You can use this to
		cleanup some files, git commit/push, or whatever you feel like. Just be sure to invoke the `done()` function afterwards.
	*/
	postBuild : function (done) {

		function moveFiles(from, to, copyOnly) {

			from = (from[0] == "/") ? from : process.cwd() + "/" + from;
			to = (to[0] == "/") ? to : process.cwd() + "/" + to;

			var fromStats = fs.statSync(from);
			var fromName = from.substr(from.lastIndexOf("/"));

			if (fromStats.isDirectory()) {

				if (!fs.existsSync(to)) {
					wrench.mkdirSyncRecursive(to);
				}

				var files = fs.readdirSync(from);
				for(var i = 0; i < files.length; i ++){
					moveFiles(from + "/" + files[i], to + "/" + files[i], copyOnly);
				}

				if (!copyOnly) {
					wrench.rmdirSyncRecursive(from);
				}
			}

			else {
				if (fs.existsSync(to) && !copyOnly) {
					fs.unlinkSync(to);
				}

				fs.linkSync(from, to);
			}
		};

		function removeFiles(obj, ignoreAr) {
			var stats = fs.statSync(obj);

			if (stats.isDirectory()) {
				var files = fs.readdirSync(obj);

				for(var i = 0; i < files.length; i ++){
					removeFiles(obj + "/" + files[i], ignoreAr);
				};

				if (ignoreAr.indexOf(obj) < 0) {
					// fs.unlinkSync(obj);
					wrench.rmdirSyncRecursive(obj);
				} else {
					console.log("IGNORING::".green + obj.yellow);
				}
			} else if (ignoreAr.indexOf(obj) < 0) {
				fs.unlinkSync(obj);
			} else {
				console.log("IGNORING: ".green + obj.yellow);
			}
		};

		function copytoGHPages(from, to, ignoreAr) {
			var f = from,
				t = to;

			from = (from[0] == "/") ? from : process.cwd() + "/" + from;
			to = (to[0] == "/") ? to : process.cwd() + "/" + to;

			if (!fs.existsSync(to)) {
				wrench.mkdirSyncRecursive(to);
			}

			for (var i = 0; i < ignoreAr.length; i++) {
				ignoreAr[i] = to + ignoreAr[i];
			}

			removeFiles(to, ignoreAr); // clear destination folder
			moveFiles(f, t, true);
		}

		moveFiles.bind(this);

		var output = path.join(__dirname, this.output_dir);
		var local_dir = path.join(output, "static", "local");

		copytoGHPages(this.output_dir, this.gh_pages_dir, ["", "/.git"]);

		if (fs.existsSync(local_dir)) {
			moveFiles(local_dir, output);
		}

		done();
	}

};
