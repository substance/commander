(function(root) { "use strict";

var Mousetrap = root.Mousetrap;

var Keyboard = function(mainControl) {
  this.__bindings = {};
  this.__mainControl = mainControl;
  this.__controls = [];
};

Keyboard.__prototype__ = function() {

  // Recursively merges the bindings defined in b2 into the
  // (sub-)context specification b1
  // --------
  //

  function __registerBindings(self, definition) {
    var path = definition.context.split(".");
    var context = self.__bindings;

    // prepare the hierarchical data structure
    for (var i = 0; i < path.length; i++) {
      var c = path[i];
      context.contexts = context.contexts || {};
      context.contexts[c] = context.contexts[c] || {};
      context = context.contexts[c];
    }

    // add the commands into the given context
    context.commands = context.commands || [];
    context.commands = context.commands.concat(definition.commands);
  }


  function __createCallback(control, command, args) {
    return function(e) {
      control[command].apply(control, args);
      e.preventDefault();
    };
  }

  function __bind(control, commands) {
    if (commands === undefined) return;

    for (var i = 0; i < commands.length; i++) {
      var command = commands[i];
      Mousetrap.bind(command.keys, __createCallback(control, command.command, command.args));
    }
  }

  function __createBindings(self) {
    // TODO: would be great to have Mousetrap more modular and create several immutable
    // versions which would be switched here
    Mousetrap.reset();

    // TODO build active key mappings from registered bindings
    var controls = self.__controls;

    __bind(self.__mainControl, self.__bindings.commands);

    var context, control,
        bindings = self.__bindings;

    for (var i = 0; i < controls.length; i++) {
      context = controls[i][0];
      control = controls[i][1];

      if (bindings.contexts === undefined || bindings.contexts[context] === undefined) {
        break;
      }

      bindings = bindings.contexts[context];
      __bind(control, bindings.commands);
    }
  }

  // Registers bindings declared in the definition.
  // --------
  //

  this.registerBindings = function(definition) {
    console.log("Keyboard.registerBindings: definition=", definition);
    for (var i = 0; i < definition.length; i++) {
      var def = definition[i];
      __registerBindings(this, def);
    }
  };

  // Updates the keyboard bindings after application state changes.
  // --------
  //

  this.stateChanged = function() {
    console.log("Keyboard.stateChanged()");
    // controllers are structured in hierarchical contexts
    // having one controller taking responsibility for each context.
    this.__controls = this.__mainControl.getActiveControllers();
    __createBindings(this);
  };

  // Enters a subcontext using a given controller.
  // --------
  //
  // Use this to add finer grained sub-states. The sub-context will be kept
  // until `exit(context)` is called or the application state is changed.

  this.enter = function(context, control) {
    this.__controls.push([context, control]);
    __createBindings(this);
  };

  // Exits a previously entered subcontext.
  // --------
  //

  this.exit = function(context) {
    var pos = -1;
    for (var i = this.__controls.length - 1; i >= 0; i--) {
      if (this.__controls[i][0] === context) {
        pos = i;
        break;
      }
    }
    if (pos < 0) {
      throw new Error("Unknown context: " + context, ", expected one of: " + JSON.stringify(this.__contexts));
    }
    this.__controls = this.__controls.slice(0, pos);
    __createBindings(this);
  };

};
Keyboard.prototype = new Keyboard.__prototype__();

if (typeof exports === 'undefined') {
  root.Substance.Keyboard = Keyboard;
} else {
  module.exports = Keyboard;
}

})(this);
