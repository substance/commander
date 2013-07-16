(function(root) { "use strict";

var Mousetrap = root.Mousetrap;

var Keyboard = function(mainControl) {

  this.__bindings = {};

  this.__mainControl = mainControl;
  this.__contexts = [];
  this.__controls = [];

};

Keyboard.__prototype__ = function() {

  // Recursively merges the bindings defined in b2 into the
  // (sub-)context specification b1
  // --------
  //

  function __registerBindings(b1, b2) {
    if (b2.commands) {
      if (b1.commands === undefined) b1.commands = [];
      b1.commands = b1.commands.concat(b2.commands);
    }

    if (b2.contexts) {
      b1.contexts = b1.contexts || {};

      for(var context in b2.contexts) {
        b1.contexts[context] = b1.contexts[context] || {};
        __registerBindings(b1.contexts[context], b2.contexts[context]);
      }
    }
  }


  function __createCallback(control, command, args) {
    return function() {
      control[command].apply(control, args);
    };
  }

  function __bind(control, bindings) {
    for (var i = 0; i < bindings.commands.length; i++) {
      var command = bindings.commands[i];
      Mousetrap.bind(command.keys, __createCallback(control, command.command, command.args));
    }
  }

  function __createBindings(self) {
    // TODO: would be great to have Mousetrap more modular and create several immutable
    // versions which would be switched here
    Mousetrap.reset();

    // TODO build active key mappings from registered bindings
    var contexts = self.__contexts;
    var controls = self.__controls;

    __bind(self.__mainControl, self.__bindings);

    var context, control,
        bindings = self.__bindings;

    for (var i = 0; i < contexts.length; i++) {
      context = contexts[i];
      control = controls[i];

      if (bindings.contexts === undefined || bindings.contexts[context] === undefined) {
        break;
      }

      bindings = bindings.contexts[context];
      __bind(control, bindings);
    }
  }

  // Registers bindings declared in the definition.
  // --------
  //

  this.registerBindings = function(definition) {
    __registerBindings(this.__bindings, definition);
  };

  // Updates the keyboard bindings after application state changes.
  // --------
  //

  this.stateChanged = function() {
    // controllers are structured in hierarchical contexts
    // having one controller taking responsibility for each context.
    var controls = this.__mainControl.getActiveControls();
    var contexts = [];

    for (var i = 0; i < controls.length; i++) {
      contexts.push(controls[i].id);
    }

    this.__controls = controls;
    this.__contexts = contexts;
    __createBindings(this);
  };

  // Enters a subcontext using a given controller.
  // --------
  //
  // Use this to add finer grained sub-states. The sub-context will be kept
  // until `exit(context)` is called or the application state is changed.

  this.enter = function(context, control) {
    this.__contexts.push(context);
    this.__controls.push(control);

    __createBindings(this);
  };

  // Exits a previously entered subcontext.
  // --------
  //

  this.exit = function(context) {
    var pos = this.__contexts.indexOf(context);
    if (pos < 0) {
      throw new Error("Unknown context: " + context, ", expected one of: " + JSON.stringify(this.__contexts));
    }
    this.__contexts = this.__contexts.slice(0, pos);
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
