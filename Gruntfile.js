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
      swf: {
        files: [ "src/fallback.as" ],
        tasks: [ "swf" ]
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
          report: "min"
        }
      }
    }
  });

  grunt.registerTask("typo", function() {
    var check = 0;
    var typo  = 0;
    var constants = grunt.file.readJSON("src/const.json");
    var re1 = /^define\(function\(require, exports, module\) {$/;
    var re2 = /[^a-zA-Z0-9_$]C\.([A-Z0-9_]+)/g;
    var files = grunt.file.expand("src/cc/**/*.js").filter(function(file) {
      return !/_test\.js$/.test(file);
    });
    files.forEach(function(file) {
      var code = grunt.file.read(file);
      var head = code.split("\n")[0];
      if (!re1.test(head)) {
        grunt.verbose.or.write("Typong " + file + "...");
        grunt.log.error();
        grunt.log.writeln("  " + head);
        typo += 1;
      }
      var m;
      re2.lastIndex = 0;
      while ((m = re2.exec(code)) !== null) {
        if (!constants.hasOwnProperty(m[1])) {
          grunt.verbose.or.write("Typong " + file + "...");
          grunt.log.error();
          grunt.log.writeln("  C." + m[1]);
          typo += 1;
        }
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
        var constants = grunt.file.readJSON("src/const.json");
        Object.keys(constants).forEach(function(key) {
          var re = new RegExp("C\." + key + "(?![A-Z0-9_])", "g");
          text = text.replace(re, constants[key]);
        });
        return text;
      },
      function(text) {
        var re = /(global\.(?:.+?) = "load\((.+?)\)";)/gm;
        var m;
        while ((m = re.exec(text)) !== null) {
          var code = grunt.file.read(m[2]);
          text = text.replace(m[1], code);
        }
        return text;
      },
      function(text) {
        text = text.replace(/^define\((['"].+?['"]), \[(.+?)\], function\(require, exports, module\) {$/gm, "define($1, function(require, exports, module) {");
        text = text.replace(/\s*['"]use strict['"];$/gm, "");
        text = text.replace(/#{VERSION}/g, grunt.config.get("pkg.version"));
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

  grunt.registerTask("swf", function() {
    var done = this.async();
    var child = grunt.util.spawn({
      cmd : "mxmlc",
      args: ["-o", "coffee-collider-fallback.swf", "./src/fallback.as"]
    }, function(err, result) {
      if (result.code !== 0) {
        grunt.fail.fatal("Compile failed. See the above error message.");
      }
      done();
    });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  });

  grunt.registerTask("test", function() {
    require("amd-loader");

    var Mocha = require("mocha");
    var mocha = new Mocha();

    global.C = grunt.file.readJSON("src/const.json");

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
  grunt.registerTask("build"  , ["check", "dryice"]);
  grunt.registerTask("default", ["build", "connect", "watch"]);
  grunt.registerTask("travis" , ["typo", "jshint", "test:travis"]);

};
