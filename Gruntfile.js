module.exports = function(grunt) {
  "use strict";

  var path   = require("path");
  var assert = require("chai").assert;
  
  assert.deepCloseTo = function(expected, actual, delta) {
    expected.forEach(function(x, i) {
      if (isNaN(x)) {
        assert.isTrue(isNaN(actual[i]), "NaN");
      } else if (x === +Infinity) {
        assert.equal(actual[i], +Infinity);
      } else if (x === -Infinity) {
        assert.equal(actual[i], -Infinity);
      } else {
        assert.closeTo(actual[i], x, delta);
      }
    });
  };
  
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-este-watch");

  var testFailed = [];
  var isDebugging = function() {
    var files = grunt.file.expand("src/cc/**/*.js");
    return files.some(function(file) {
      var code = grunt.file.read(file);
      if (/_test\.js/.test(file)) {
        return /^\s*(describe|it)\.only\(\"/m.test(code);
      } else {
        return /console\.debug\(.*\)/m.test(code);
      }
    });
  };
  
  var resetBuitInPrototype = (function() {
    var builtins = {};
    [Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
      builtins[Klass.toString()] = Object.getOwnPropertyNames(Klass.prototype);
    });
    return function() {
      [Array, Boolean, Date, Function, Number, String].forEach(function(Klass) {
        var builtin = builtins[Klass.toString()];
        Object.getOwnPropertyNames(Klass.prototype).map(function(key) {
          if (builtin.indexOf(key) === -1) {
            delete Klass.prototype[key];
          }
        });
      });
    };
  })();
  
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    esteWatch: {
      options: {
        dirs: [ "src/**/"  ],
      },
      js: function(filepath) {
        if (/src\//.test(filepath)) {
          if (/_test\.js$/.test(filepath)) {
            return "test:" + filepath;
          }
          grunt.config(["jshint", "files"], filepath);
          var tasks = [ "typo", "jshint", "test:" + filepath, "dryice" ];
          return tasks;
        }
      },
      json: function(filepath) {
        if (/src\/cc\/test\//.test(filepath)) {
          return "test:test";
        }
        return [ "dryice" ];
      },
      coffee: function(filepath) {
        if (/src\/cc\/test\//.test(filepath)) {
          return "test:test";
        }
      },
      as: function() {
        return [ "swf" ];
      }
    },
    connect: {
      server: {
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
          "build/coffee-collider-min.js": [ "build/coffee-collider.js" ]
        },
        options: {
          sourceMap: "build/coffee-collider-min.map",
          report: "gzip"
        }
      }
    },
    compress: {
      cc: {
        options: {
          archive: "build/coffee-collider.zip"
        },
        files: [
          {
            expand: true,
            src: [ "*.js", "*.map", "*.swf" ],
            dest: "coffee-collider",
            cwd : "build"
          }
        ]
      }
    }
  });
  
  grunt.registerTask("typo", function() {
    var check = 0;
    var typo  = 0;
    var constants = grunt.file.readJSON("src/const.json");
    var re1 = /^define\(function\(require, exports, module\) {$/;
    var re2 = /[^a-zA-Z0-9_$]C\.([A-Z0-9_]+)/g;

    var files = grunt.file.expand(grunt.config(["jshint", "files"]));
    files = files.filter(function(file) {
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
    var arg0 = arguments[0];
    if (arg0 !== "force" && isDebugging()) {
      grunt.fail.warn("NOT built with debug mode.");
      return;
    }
    var copy = require("dryice").copy;
    var srcroot = "src";
    var main = "cc/loader";
    var dest = "build/coffee-collider";
    
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
        text += 'var exports = _require("cc/cc", "' + main + '");\n';
        text += 'if (typeof module !== "undefined") {\n  module.exports = exports;\n}\n';
        return text;
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
      args: ["-o", "build/coffee-collider-fallback.swf", "src/fallback.as"]
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
    var arg0 = arguments[0];
    if (arg0 === "integration") {
      doMochaTest("list", grunt.file.expand("test/**/*.coffee"), this.async());
      return;
    }
    
    // reset the test environment
    Object.keys(require.cache).forEach(function(filepath) {
      if (!/\/node_modules\//.test(filepath)) {
        delete require.cache[filepath];
      }
    });
    resetBuitInPrototype();
    
    var istanbul, Instrumenter, Collector, Report, hook;
    var coverageVar, instrumenter, transformer;
    
    var reporter = "min";
    var tstFiles = [];
    var covFiles = [];
    var matchFn = function(file) {
      return covFiles.indexOf(file) !== -1;
    };

    if (typeof arg0 === "undefined") {
      arg0 = "test";
    }
    
    if (arg0 === "travis") {
      reporter = "list";
      tstFiles = grunt.file.expand("src/cc/**/*_test.js");
    } else if (arg0 === "test") {
      tstFiles = grunt.file.expand("src/cc/**/*_test.js");
      reporter = "dot";
    } else {
      grunt.file.expand("src/cc/**/*_test.js").forEach(function(file) {
        if (file.indexOf(arg0) !== -1) {
          tstFiles.push(file);
          covFiles.push(path.resolve(file.replace(/_test\.js$/, ".js")));
        }
      });
      if (tstFiles.length === 0) {
        var related = arg0.replace(/\.js$/, "_test.js");
        if (grunt.file.exists(related)) {
          tstFiles.push(related);
        }
      }
      if (/_test\.js$/.test(arg0)) {
        reporter = "nyan";
      } else if (/\.js$/.test(arg0)) {
        reporter = "min";
      } else {
        reporter = "spec";
      }
    }
    tstFiles = tstFiles.concat(testFailed);
    
    var set = {};
    tstFiles = tstFiles.filter(function(file) {
      if (!set[file] && /_test\.js$/.test(file)) {
        return (set[file] = true);
      }
      return false;
    });
    
    if (covFiles.length) {
      istanbul = require("istanbul");
      Instrumenter = istanbul.Instrumenter;
      Collector    = istanbul.Collector;
      Report       = istanbul.Report;
      hook         = istanbul.hook;
      
      coverageVar = "$$cov_" + Date.now() + "$$";
      instrumenter = new Instrumenter({
        coverageVariable:coverageVar
      });
      transformer = instrumenter.instrumentSync.bind(instrumenter);
      hook.hookRequire(matchFn, transformer);
      
      global[coverageVar] = {};
    }
    
    var done = this.async();
    doMochaTest(reporter, tstFiles, function(failures) {
      if (failures) {
        grunt.fail.fatal("test failed.");
        testFailed = tstFiles;
      } else {
        testFailed = [];
      }
      if (arg0 === "travis") {
        if (isDebugging()) {
          grunt.fail.warn("test succeeded, but not completely.");
        }
      }
      if (covFiles.length) {
        var collector = new Collector();
        collector.add(global[coverageVar]);
        Report.create("text").writeReport(collector, true);
      }
      done();
    });
  });
  
  grunt.registerTask("coverage", function() {
    var arg0 = arguments[0];
    
    var istanbul = require("istanbul");
    var Instrumenter = istanbul.Instrumenter;
    var Collector    = istanbul.Collector;
    var Report       = istanbul.Report;
    var hook         = istanbul.hook;
    
    var coverageVar = "$$cov_" + Date.now() + "$$";
    var instrumenter = new Instrumenter({
      coverageVariable:coverageVar
    });
    var transformer = instrumenter.instrumentSync.bind(instrumenter);
    
    var tstFiles = [];
    var covFiles = {};
    
    if (arg0) {
      grunt.file.expand("src/cc/**/*_test.js").forEach(function(file) {
        if (file.indexOf(arg0) !== -1) {
          tstFiles.push(file);
          covFiles[path.resolve(file.replace(/_test\.js$/, ".js"))] = true;
        }
      });
    } else {
      grunt.file.expand("src/cc/**/*.*").forEach(function(file) {
        var filepath = path.resolve(file);
        if (/_test\.js$/.test(filepath)) {
          tstFiles.push(filepath);
        } else {
          covFiles[filepath] = true;
        }
      });
    }
    var matchFn = function(filepath) {
      return covFiles[filepath];
    };
    hook.hookRequire(matchFn, transformer);
    
    global[coverageVar] = {};
    
    var done = this.async();
    doMochaTest("nyan", tstFiles, function() {
      var reports = [];
      reports.push(Report.create("text"));
      reports.push(Report.create("lcov", { dir:"coverage" }));
      
      var cov = global[coverageVar];
      grunt.file.write("coverage/coverage.json", JSON.stringify(cov));
      
      var collector = new Collector();
      collector.add(cov);
      
      reports.forEach(function(report) {
        report.writeReport(collector, true);
      });
      
      done();
    });
  });
  
  var doMochaTest = function(reporter, files, callback) {
    require("amd-loader");
    
    var Mocha = require("mocha");
    var mocha = new Mocha();
    
    global.require = require;
    global.C = grunt.file.readJSON("src/const.json");
    console.debug = console.log.bind(console);
    
    files.forEach(function(file) {
      mocha.addFile(file);
    });
    
    mocha.reporter(reporter).run(function(failures) {
      callback(failures);
    });
  };
  
  grunt.registerTask("check", ["typo", "jshint", "test"]);
  grunt.registerTask("build", ["typo", "jshint", "test", "dryice"]);
  grunt.registerTask("build:all", ["build", "uglify", "compress"]);
  grunt.registerTask("build:force", ["dryice:force"]);
  grunt.registerTask("default", ["connect", "esteWatch"]);
  grunt.registerTask("travis" , ["typo", "jshint", "test:travis", "test:integration"]);

};
