#!/usr/bin/env node
(function() {
  "use strict";

  var cc = require("../build/coffee-collider.js");
  var fs = require("fs");
  var optparse = require("optparse");
  
  var SWITCHES = [
    ["-c", "--compile", "compile to JavaScript and save as .js files"],
    ["-p", "--print"  , "print out the compiled JavaScript"          ],
    ["-v", "--version", "display the version number"                 ],
  ];
  var BANNER = "Usage: coffeecollider [options] path/to/script.coffee";
  
  var parser = new optparse.OptionParser(SWITCHES, BANNER);
  var opts   = {};
  
  parser.on("compile", function() {
    opts.compile = true;
  });
  parser.on("print", function() {
    opts.print = true;
  });
  parser.on("version", function() {
    opts.version = true;
  });
  
  var client = cc.CoffeeCollider();
  var args   = parser.parse(process.argv.slice(2));
  var filepath = args[0] || "";
  var src = null, code = null;
  
  if (filepath && /\.coffee$/.test(filepath)) {
    src  = fs.readFileSync(filepath).toString();
    code = client.compile(src.trim());
  }
  
  if (opts.version) {
    console.log("CoffeeCollider version " + cc.version);
  }
  if (src) {
    if (opts.print) {
      console.log(code);
    }
    if (opts.compile) {
      filepath = filepath.replace(/\.coffee$/, ".js");
      fs.writeFileSync(filepath, code);
    } else {
      client.execute(code, {lang:"js"}).play();
    }
  }

})();
