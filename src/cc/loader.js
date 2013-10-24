define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");

  if (typeof document !== "undefined") {
    cc.context = "window";
    require("./exports/installer").install();
  } else if (typeof WorkerLocation !== "undefined") {
    cc.context = "worker";
    require("./client/installer").install();
    require("./server/installer").install();
    cc.client.sendToServer = cc.server.recvFromClient.bind(cc.server);
    cc.server.sendToClient = cc.client.recvFromServer.bind(cc.client);
    cc.server.connect();
  }
  
  module.exports = {
  };

});
