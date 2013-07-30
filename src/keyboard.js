"use strict";

require("../lib/mousetrap");
var Mousetrap = window.Mousetrap;

var Keyboard = function(mainControl) {
  this.__bindings = {};
  this.__mainControl = mainControl;
  this.__controls = [];
  this.__defaultHandler = null;
};

Keyboard.__prototype__ = function() {

  // keep the original key handler for delegation
  var __handleKey = Mousetrap.handleKey;

  function __getContext(self, pathStr) {
    var path = pathStr.split(".");
    var context = self.__bindings;

    // prepare the hierarchical data structure
    for (var i = 0; i < path.length; i++) {
      var c = path[i];
      context.contexts = context.contexts || {};
      context.contexts[c] = context.contexts[c] || {};
      context = context.contexts[c];
    }

    return context;
  }

  function __registerBindings(self, definition) {
    var context = __getContext(self, definition.context);
    // add the commands into the given context
    context.commands = context.commands || [];
    context.commands = context.commands.concat(definition.commands);
  }

  function __createCallback(control, commandSpec) {
    var obj = control;
    if (commandSpec.scope) {
      obj = control[commandSpec.scope];
    }
    // default is preventing the default
    var preventDefault = (commandSpec.preventDefault !== "false");

    return function(e) {
      obj[commandSpec.command].apply(obj, commandSpec.args);
      if (preventDefault) e.preventDefault();
    };
  }

  function __bind(control, commands) {
    if (commands === undefined) return;

    for (var i = 0; i < commands.length; i++) {
      var command = commands[i];
      Mousetrap.bind(command.keys, __createCallback(control, command));
    }
  }

  function __injectDefaultHandler(defaultHandlers) {
    if (!defaultHandlers || defaultHandlers.length === 0) return;

    var handleKey = function(character, modifiers, e) {
      if (__handleKey(character, modifiers, e)) return;

      for (var i = defaultHandlers.length - 1; i >= 0; i--) {
        var item = defaultHandlers[i];

        // the handler function must return a command specification that
        // will be interpreted by the associated controller
        var cmd = item.handler(character, modifiers, e);

        // if the handler does not take care of the event
        // cmd should be falsy
        if (cmd) {
          var control = item.control;
          var command = cmd.command;
          var args = cmd.args;
          control[command].apply(control, args);

          // we prevent the default behaviour and also bubbling through
          // eventual parent default handlers.
          //e.preventDefault();
          return;
        }
      }
    };

    Mousetrap.handleKey = handleKey;
  }

  function __createBindings(self) {
    // TODO: would be great to have Mousetrap more modular and create several immutable
    // versions which would be switched here
    Mousetrap.reset();
    Mousetrap.handleKey = __handleKey;
    var defaultHandlers = [];

    function processBinding(context, control, bindings) {
      __bind(control, bindings.commands);
      if (bindings.default !== undefined) {
        defaultHandlers.push({
          context: context,
          control: control,
          handler: bindings.default
        });
      }
    }

    // TODO build active key mappings from registered bindings
    var controls = self.__controls;
    var bindings = self.__bindings;
    var context = "";
    var control = self.__mainControl;

    processBinding(context, control, bindings);

    for (var i = 0; i < controls.length; i++) {
      context = controls[i][0];
      control = controls[i][1];

      if (bindings.contexts === undefined || bindings.contexts[context] === undefined) {
        break;
      }

      bindings = bindings.contexts[context];
      processBinding(context, control, bindings);
    }

    __injectDefaultHandler(defaultHandlers);
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
    this.stateChanged();
  };

  this.setDefaultHandler = function(contextStr, handler) {
    var context = __getContext(this, contextStr);
    context.default = handler;
  };

  // Updates the keyboard bindings after application state changes.
  // --------
  //

  this.stateChanged = function() {
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

  // Supported flags:
  // TRIGGER_PREFIX_COMBOS: trigger combos that are already part of other sequences (default: false)
  this.set = function(prop, value) {
    Mousetrap[prop] = value;
  };

};
Keyboard.prototype = new Keyboard.__prototype__();

module.exports = Keyboard;
