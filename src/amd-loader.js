/*
 * origin
 * https://github.com/ajaxorg/node-amd-loader
 */

var path = require("path");
var fs = require("fs");
var Module = require("module");

var moduleStack = [];
var defaultCompile = module.constructor.prototype._compile;

module.constructor.prototype._compile = function(content, filename){  
    moduleStack.push(this);
    try {        
        return defaultCompile.call(this, content, filename);
    }
    finally {
        moduleStack.pop();
    }
};

global.define = function (id, injects, factory) {

    // infere the module
    var currentModule = moduleStack[moduleStack.length-1];
    var module = currentModule || require.main;
    
    // parse arguments
    if (!factory) {
        // two or less arguments
        factory = injects;
        if (factory) {
            // two args
            if (typeof id === "string") {
                if (id !== module.id) {
                    throw new Error("Can not assign module to a different id than the current file");
                }
                // default injects
                injects = [];
            }
            else{
                // anonymous, deps included
                injects = id;          
            }
        }
        else {
            // only one arg, just the factory
            factory = id;
            injects = [];
        }
    }

    var req = function(module, relativeId, callback) {
        if (Array.isArray(relativeId)) {
            // async require
            return callback.apply(this, relativeId.map(req))
        }
        
        var chunks = relativeId.split("!");
        if (chunks.length >= 2) {
            var prefix = chunks[0];
            relativeId = chunks.slice(1).join("!");
        }
        
        var fileName;
        if (/^cc/.test(relativeId)) {
            fileName = path.normalize(__dirname + "/" + relativeId + ".js");
        } else {
            fileName = Module._resolveFilename(relativeId, module);
        }
        if (Array.isArray(fileName))
            fileName = fileName[0];
        
        if (prefix && prefix.indexOf("text") !== -1) {
            return fs.readFileSync(fileName);
        } else
            return require(fileName);
    }.bind(this, module);

    injects.unshift("require", "exports", "module");
    
    id = module.id;
    if (typeof factory !== "function") {
        // we can just provide a plain object
        return module.exports = factory;
    }
    
    var returned = factory.apply(module.exports, injects.map(function (injection) {
        switch (injection) {
            // check for CommonJS injection variables
            case "require": return req;
            case "exports": return module.exports;
            case "module": return module;
            default:
                // a module dependency
                return req(injection);
        }
    }));
    
    if (returned) {
        // since AMD encapsulates a function/callback, it can allow the factory to return the exports.
        module.exports = returned;
    }
};
