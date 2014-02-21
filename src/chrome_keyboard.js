"use strict";

var _ = require("underscore");
var util = require("substance-util");

function _attachListener(el, type, callback) {
  if (el.addEventListener) {
    el.addEventListener(type, callback, true);
  } else {
    el.attachEvent('on' + type, callback);
  }
}

function _detachListener(el, type, callback) {
  if (el.removeEventListener) {
    el.removeEventListener(type, callback, true);
  } else {
    el.detachEvent('on' + type, callback);
  }
}

var ChromeKeyboard = function(map, keytable) {

  this.keytable = keytable;
  this.map = map;

  this.registry = {};

  if (!keytable) {
    var DefaultKeyTable =  require("./default_keytable.js");
    this.keytable = new DefaultKeyTable();
  }

  // to detect if there is a candidate for a given key
  this.__registeredKeyCodes = {"keypress": {}, "keyup": {}, "keydown": {}};

  this.defaultHandlers = {
    "keypress": this.PASS,
    "keyup": this.BLOCK,
    "keydown": this.PASS
  };
};

ChromeKeyboard.Prototype = function() {

  // handler to pass events (does not call prevent default)
  this.PASS = function() {
    // console.log('Keyboard: passing event to parent.');
  };

  this.BLOCK = function(e) {
    //console.log('Keyboard: blocking event.', e);
    e.preventDefault();
    e.stopPropagation();
  };

  var _mods = ['ctrlKey', 'metaKey', 'shiftKey', 'altKey', 'altGraphKey'];

  // for sorting modifiers
  var _modPos = {};
  for (var i = 0; i < _mods.length; i++) {
    _modPos[_mods[i]] = i;
  }

  var _modName = {
    'ctrl': 'ctrlKey',
    'command': 'metaKey',
    'shift': 'shiftKey',
    'alt': 'altKey',
    'alt-gr': 'altGraphKey'
  };

  var _inverseModNames = {};
  _.each(_modName, function(mod, name) {
    _inverseModNames[mod] = name;
  });

  //console.log("_inverseModNames", _inverseModNames);

  this.defaultHandler = function(e) {
    // console.log("Default handler: preventing event", e);
    e.preventDefault();
  };

  var _lookupHandler = function(self, e, start) {
    if (!start) return null;

    var reg = start;
    // traverse to the particular registry for the present modifiers
    for (var i = 0; i < _mods.length; i++) {
      var mod = _mods[i];
      if (e[mod]) {
        reg = reg[mod];
      }
      if (!reg) return null;
    }

    if (reg) {
      var keyCode = e.keyCode;
      if (e.type === "keypress") {
         keyCode = e.keyCode || self.keytable.table[String.fromCharCode(e.which)];
      }
      return reg[keyCode];
    } else {
      return null;
    }
  };

  this.handleKeyPress = function(e) {
    var type = "keypress";
    //console.log("Keyboard keypress", e, this.describeEvent(e));
    // do not handle events without a character...
    if (String.fromCharCode(e.which)) {
      var handler = _lookupHandler(this, e, this.registry[type]);
      if (handler) {
        try {
          handler(e);
        } catch (err) {
          this.BLOCK(e);
          console.error(err.message);
          util.printStackTrace(err);
          throw err;
        }
      } else if (this.defaultHandlers[type]) {
        this.defaultHandlers[type](e);
      }
    } else if (this.defaultHandlers[type]) {
      this.defaultHandlers[type](e);
    } else {
      throw new Error("No default handler for: " + type);
    }

  };

  this.handleKey = function(type, e) {
    // console.log("Keyboard handleKey", type, this.describeEvent(e));
    if (this.__registeredKeyCodes[type][e.keyCode]) {
      //console.log("Keyboard.handleKey", type, this.describeEvent(e));

      var handler = _lookupHandler(this, e, this.registry[type]);

      if (handler) {
        //console.log("... found handler", handler);
        try {
          handler(e);
        } catch (err) {
          this.BLOCK(e);
          console.error(err.message);
          util.printStackTrace(err);
          throw err;
        }
      }
    } else if (this.defaultHandlers[type]) {
      this.defaultHandlers[type](e);
    } else {
      throw new Error("No default handler for: " + type);
    }
  };

  this.connect = function(el) {
    this.el = el;
    this.__onKeyPress = this.handleKeyPress.bind(this);
    this.__onKeyUp = this.handleKey.bind(this, "keyup");
    this.__onKeyDown = this.handleKey.bind(this, "keydown");
    _attachListener(el, 'keypress', this.__onKeyPress);
    _attachListener(el, 'keydown', this.__onKeyDown);
    _attachListener(el, 'keyup', this.__onKeyUp);

    // console.log("Attaching keyboard to", el, "bindings:", this.registry);
  };

  this.disconnect = function() {
    _detachListener(this.el, 'keypress', this.__onKeyPress);
    _detachListener(this.el, 'keydown', this.__onKeyDown);
    _detachListener(this.el, 'keyup', this.__onKeyUp);
  };

  this.setDefaultHandler = function(type, handler) {
    if (arguments.length === 1) {
      _.each(this.defaultHandlers, function(__, name) {
        this.defaultHandlers[name] = arguments[0];
      }, this);
    } else {
      this.defaultHandlers[type] = handler;
    }
  };

  // Bind a handler for a key combination.
  // -----
  // Only key combinations with modifiers and a regular key.
  // Examples:
  // bind('ctrl', 'shift', 'r', myhandler);
  // TODO: I want to get rid of the type. Instead introduce an abstraction
  // that triggers key repetition using only one handler
  this.bindSingle = function(combination, type, handler) {

    if (["keypress", "keydown", "keyup"].indexOf(type) < 0) {
      throw new Error("Expecting keyboard event type as second argument.");
    }
    if (!_.isFunction(handler)) {
      throw new Error("Expecting function handler as third argument.");
    }

    // Note: extract modifiers from the combination.
    // They can be provided in arbitrary order.
    var i;
    var mods = [];
    var mod, modName;
    for (i = 0; i < combination.length-1; i++) {
      modName = combination[i];
      mod = _modName[modName];
      if (!mod) {
        throw new Error("Unknown modifier: " + modName);
      }
      mods.push(mod);
    }
    var key = _.last(combination);
    var keyCode = this.keytable.getKeyCode(key);

    // if the name implies extra modifiers the map can return an array
    if (_.isArray(keyCode)) {
      for (i = 0; i < keyCode.length-1; i++) {
        modName = keyCode[i];
        mod = _modName[modName];
        if (!mod) {
          throw new Error("Unknown modifier: " + modName);
        }
        mods.push(mod);
      }
      keyCode = _.last(keyCode);
    }

    mods.sort(function(a, b) {
      return _modPos[a] - _modPos[b];
    });

    this.registry[type] = this.registry[type] || {};
    var reg = this.registry[type];
    for (i = 0; i < mods.length; i++) {
      mod = mods[i];
      reg[mod] = reg[mod] || {};
      reg = reg[mod];
    }

    reg[keyCode] = handler;

    this.__registeredKeyCodes[type][keyCode] = true;
  };

  this.bindAll = function(combinations, type, handler) {
    for (var i = 0; i < combinations.length; i++) {
      this.bindSingle(combinations[i], type, handler);
    }
  };

  this.bind = function(combination, type, handler) {
    var combinations;
    if (_.isString(combination)) {
      combinations = this.compileMapping(combination);
      this.bindAll(combinations, type, handler);
    } else {
      this.bindSingle(combination, type, handler);
    }
  };

  this.pass = function(combination) {
    var combinations;
    if (_.isString(combination)) {
      combinations = this.compileMapping(combination);
    } else {
      combinations = [combination];
    }
    this.bindAll(combinations, "keyup", this.PASS);
    this.bindAll(combinations, "keydown", this.PASS);
    this.bindAll(combinations, "keypress", this.PASS);
  };

  this.compileMapping = function(name) {
    var combinations = [];
    var specs = this.map[name];
    for (var i = 0; i < specs.length; i++) {
      var spec = specs[i];
      var combination = spec.split("+");
      combinations.push(combination);
    }
    return combinations;
  };

  this.describeEvent = function(e) {
    var names = [];
    for (var i = 0; i < _mods.length; i++) {
      var mod = _mods[i];
      if (e[mod] === true) {
        names.push(_inverseModNames[mod]);
      }
    }
    names.push(this.keytable.getKeyName(e.keyCode));

    return names.join("+");
  };
};
ChromeKeyboard.prototype = new ChromeKeyboard.Prototype();

module.exports = ChromeKeyboard;
