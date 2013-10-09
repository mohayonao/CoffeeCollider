module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    watch: {
      livereload: {
        files: [ "index.html", "coffee-collider.js" ],
        options: {
          livereload: true
        },
      },
      build: {
        files: [ "src/cc/**/*.js", "!src/cc/**/*_test.js" ],
        tasks: [ "build" ],
      },
      test: {
        files: [ "src/cc/**/*_test.js" ],
        tasks: [ "test" ],
      },
    },
    connect: {
      livereload: {
        options: {
          port    : process.env.PORT || 3000,
          hostname: "*"
        }
      }
    },
    jshint: {
      files: "src/cc/**/*.js",
      options: grunt.file.readJSON(".jshintrc")
    },
    uglify: {
      cc: {
        files: {
          "coffee-collider-min.js": [ "coffee-collider.js" ]
        },
        options: {
          sourceMap: "coffee-collider-min.map",
          report: "gzip"
        }
      }
    }
  });

  grunt.registerTask("typo", function() {
    var check = 0;
    var typo  = 0;
    var re = /^define\(function\(require, exports, module\) {$/;
    var files = grunt.file.expand("src/cc/**/*.js").filter(function(file) {
      return !/_test\.js$/.test(file);
    });
    files.forEach(function(file) {
      var code = grunt.file.read(file).split("\n")[0];
      if (!re.test(code)) {
        grunt.verbose.or.write("Typong " + file + "...");
        grunt.log.error();
        grunt.log.writeln("  " + code);
        typo += 1;
      }
      check += 1;
    });
    if (typo === 0) {
      grunt.log.ok(check + " files typo free.");
      return true;
    }
    return false;      
  });

  grunt.registerTask("dryice", function() {
    var copy = require("dryice").copy;
    var srcroot = "src";
    var main = "cc/loader";
    var dest = "coffee-collider";
    
    var coffeeColliderProject = {
      roots: [srcroot]
    };
    var project = copy.createCommonJsProject(coffeeColliderProject);
    var cc = copy.createDataObject();
    var filter;

    var header = "";
    header += "(function(global) {" + "\n";
    header += '"use strict";' + "\n";

    var footer = "";
    footer += "})(this.self||global);" + "\n";
    
    copy({
      source: { value:header },
      dest  : cc
    });
    copy({
      source: [ "./src/require.js" ],
      dest  : cc
    });
    filter = [
      copy.filter.moduleDefines,
      function(text) {
        text = text.replace(/^define\((['"].+?['"]), \[(.+?)\], function\(require, exports, module\) {$/gm, "define($1, function(require, exports, module) {");
        text = text.replace(/\s*['"]use strict['"];$/gm, "");
        return text + '_require("cc/cc", "' + main + '");\n';  
      }
    ];
    copy({
      source: [ { project:project, require:main } ],
      filter: filter,
      dest  : cc
    });
    copy({
      source: { value:footer },
      dest  : cc
    });
    copy({
      source: cc,
      dest  : dest + ".js"
    });
  });

  grunt.registerTask("test", function() {
    require("./src/amd-loader");

    var Mocha = require("mocha");
    var mocha = new Mocha();

    global.cc = {};

    var reporter = "dot";
    var args = arguments[0], files = [];
    if (args === "travis") {
      reporter = "list";
    } if (args && grunt.file.exists(args)) {
      files = [ args ];
    }
    if (!files.length) {
      files = grunt.file.expand("src/cc/**/*_test.js");
    }
    files.forEach(function(file) {
      mocha.addFile(file);
    });
    var done = this.async();
    mocha.reporter(reporter).run(function(failures) {
      if (failures) {
        grunt.fail.fatal("test failed.");
      }
      if (args === "travis") {
        files.forEach(function(file) {
          var code = grunt.file.read(file);
          if (/^\s*(describe|it)\.only\("/m.test(code)) {
            grunt.fail.warn("test succeeded, but not completely.");
          }
        });
      }
      done();
    });
  });

  grunt.registerTask("check"  , ["typo", "jshint", "test"]);
  grunt.registerTask("build"  , ["check", "dryice", "uglify"]);
  grunt.registerTask("default", ["build", "connect", "watch"]);
  grunt.registerTask("travis" , ["typo", "jshint", "test:travis"]);

};
