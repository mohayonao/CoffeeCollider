module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.initConfig({
    "pkg": grunt.file.readJSON("package.json"),
    "jshint": {
      "files": "src/cc/**/*.js",
      "options": grunt.file.readJSON(".jshintrc")
    }
  });

  grunt.registerTask("build", function() {
    var copy = require("dryice").copy;
    var srcroot = "./src";
    var main = "cc/loader";
    var dest = "coffee-collider"
    
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
      source: [ srcroot + "/require.js" ],
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
      dest  : "./build/coffee-collider.js"
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

  grunt.registerTask("default", ["jshint","test","build"]);
  grunt.registerTask("travis" , ["jshint","test:travis"]);

};
