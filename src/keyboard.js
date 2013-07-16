(function(root) { "use strict";

var Keyboard = function(mainView) {

  this.mainView = mainView;


};

Keyboard.__prototype__ = function() {

  // Registers bindings declared in the definition
  // --------
  //
  // Format:
  //    {
  //      // global key bindings
  //      "commands": [
  //        {"command": "quit", "keys": ["cmd-q"]},
  //        {"command": "execute", "keys": ["cmd-x"], "args": ["format", "c:"]}
  //      ],
  //
  //      contexts: {
  //        "app": {
  //          "commands": [
  //            {"command": "open-dashboard", "keys": ["cmd+d"], "args": ["my_documents"] }
  //          ]
  //      }
  //    }

  this.registerBindings = function(definition) {

  };

  // Call this whenever another (sub-)view has been activated
  this.contextChanged = function() {
    // TODO build active key mappings from registered bindings
  };

};
Keyboard.prototype = new Keyboard.__prototype__();

if (typeof exports === 'undefined') {
  root.Substance.Keyboard = Keyboard;
} else {
  module.exports = Keyboard;
}

})(this);
