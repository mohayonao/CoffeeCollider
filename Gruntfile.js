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

    var header = function() {
      var header = "";
      header += "(function(global) {" + "\n";
      header += '"use strict";' + "\n";
      return header;
    };
    var firstRequire = function(text) {
      return text + '_require("cc/cc", "' + main + '");\n';
    };
    var footer = function() {
      var footer = "";
      footer += "})(this.self||global);" + "\n";
      return footer;
    };
    
    copy({
      source: { value:header() },
      dest  : cc
    });
    copy({
      source: [ "./src/require.js" ],
      dest  : cc
    });
    filter = [ copy.filter.moduleDefines, firstRequire ];
    copy({
      source: [ { project:project, require:main } ],
      filter: filter,
      dest  : cc
    });
    copy({
      source: { value:footer() },
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
        grunt.fail.fatal("test failed");
      }
      done();
    });
  });

  grunt.registerTask("check"  , ["jshint", "test"]);
  grunt.registerTask("build"  , ["check", "dryice", "uglify"]);
  grunt.registerTask("default", ["build", "connect", "watch"]);
  grunt.registerTask("travis" , ["jshint", "test:travis"]);

};
