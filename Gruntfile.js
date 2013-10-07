module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-jshint");

  grunt.initConfig({
    "pkg": grunt.file.readJSON("package.json"),
    "jshint": {
      "files": "src/cc/**/*.js"
    }
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

  grunt.registerTask("default", ["jshint","test"]);
  grunt.registerTask("travis" , ["jshint","test:travis"]);

};
