module.exports = function(grunt) {
  "use strict";

  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-este-watch");

  var testFailed = [];
  var hasExclusiveTest = function() {
    var files = grunt.file.expand("src/cc/**/*_test.js");
    return files.some(function(file) {
      var code = grunt.file.read(file);
      return/^\s*(describe|it)\.only\(\"/m.test(code);
    });
  };

  var resetPrototype = (function() {
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
        dirs: [ "./", "src/**/", "documents/**/" ],
      },
      js: function(filepath) {
        if (/documents\//.test(filepath)) {
          return;
        }
        if (/src\//.test(filepath)) {
          if (/_test\.js$/.test(filepath)) {
            return "test:" + filepath;
          }
          grunt.config(["jshint", "files"], filepath);
          var tasks = [ "typo", "jshint", "test:" + filepath, "dryice", "uglify" ];
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
    if (hasExclusiveTest()) {
      grunt.fail.warn("NOT builded, '.only' attribute is detected in any tests.");
      return;
    }
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
    Object.keys(require.cache).forEach(function(filepath) {
      if (!/\/node_modules\//.test(filepath)) {
        delete require.cache[filepath];
      }
    });
    require("amd-loader");

    resetPrototype();

    var Mocha = require("mocha");
    var mocha = new Mocha();

    global.C = grunt.file.readJSON("src/const.json");

    var reporter = "dot";
    var args  = arguments[0];
    var files = [];
    if (args) {
      if (args === "travis") {
        reporter = "list";
      } else if (args === "test") {
        files = grunt.file.expand("src/cc/test/*_test.js");
      } else {
        if (grunt.file.exists(args)) {
          files.push(args);
        }
        var related = args.replace(/\.js$/, "_test.js");
        if (grunt.file.exists(related)) {
          files.push(related);
        }
      }
    }

    if (!files.length) {
      files = grunt.file.expand("src/cc/**/*_test.js");
    } else {
      files = files.concat(
        grunt.file.expand("src/cc/test/*_test.js")
      );
    }
    files = files.concat(testFailed);
    var set = {};
    files = files.filter(function(file) {
      if (!set[file] && /_test\.js$/.test(file)) {
        set[file] = true;
        return true;
      }
      return false;
    });
    files.forEach(function(file) {
      mocha.addFile(file);
    });
    var done = this.async();
    mocha.reporter(reporter).run(function(failures) {
      if (failures) {
        grunt.fail.fatal("test failed.");
        testFailed = files;
      } else {
        testFailed = [];
      }
      if (args === "travis") {
        if (hasExclusiveTest()) {
          grunt.fail.warn("test succeeded, but not completely.");
        }
      }
      done();
    });
  });

  grunt.registerTask("check"  , ["typo", "jshint", "test"]);
  grunt.registerTask("build"  , ["check", "dryice", "uglify"]);
  grunt.registerTask("default", ["connect", "esteWatch"]);
  grunt.registerTask("travis" , ["typo", "jshint", "test:travis"]);

};
