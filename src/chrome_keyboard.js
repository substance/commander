"use strict";

var _ = require("underscore");

function _attachListener(el, type, callback) {
  if (el.addEventListener) {
    el.addEventListener(type, callback, false);
  } else {
    el.attachEvent('on' + type, callback);
  }
}

function _detachListener(el, type, callback) {
  if (el.removeEventListener) {
    el.removeEventListener(type, callback, false);
  } else {
    el.detachEvent('on' + type, callback);
  }
}

var ChromeKeyboard = function(keytable) {

  this.registry = {};
  this.keytable = keytable;
  if (!keytable) {
    var DefaultKeyTable =  require("./default_keytable.js");
    this.keytable = new DefaultKeyTable();
  }

  // to detect if there is a candidate for a given key
  this.__registeredKeyCodes = {"keypress": {}, "keyup": {}, "keydown": {}};

};

ChromeKeyboard.Prototype = function() {

  // handler to pass events (does not call prevent default)
  var PASS = function() {
    console.log('Keyboard: passing event to parent.');
  };

  var BLOCK = function(e) {
    console.log('Keyboard: blocking event.');
    e.preventDefault();
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

  this.defaultHandler = function(e) {
    console.log("Default handler: preventing event", e);
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
      return reg[e.keyCode];
    } else {
      return null;
    }
  };

  this.handleKeyPress = function(e) {
    // do not handle events without a character...
    if (String.fromCharCode(e.which) && this.__registeredKeyCodes["keypress"][e.keyCode]) {
      var handler = _lookupHandler(this, e, this.registry["keypress"]);
      if (handler) {
        handler(e);
      }
    } else if (this.defaultHandler) {
      return this.defaultHandler(e);
    }

    return BLOCK(e);
  };

  this.handleKey = function(type, e) {
    if (this.__registeredKeyCodes[type][e.keyCode]) {
      console.log("Keyboard.handleKey", type, e.keyCode);

      var handler = _lookupHandler(this, e, this.registry[type]);

      if (handler) {
        return handler(e);
      }
    }

    return BLOCK(e);
  };

  this.connect = function(el) {
    this.el = el;
    this.__onKeyPress = this.handleKeyPress.bind(this);
    this.__onKeyUp = this.handleKey.bind(this, "keyup");
    this.__onKeyDown = this.handleKey.bind(this, "keydown");
    _attachListener(el, 'keypress', this.__onKeyPress);
    _attachListener(el, 'keydown', this.__onKeyDown);
    _attachListener(el, 'keyup', this.__onKeyUp);
  };

  this.disconnect = function() {
    _detachListener(this.el, 'keypress', this.__onKeyPress);
    _detachListener(this.el, 'keydown', this.__onKeyDown);
    _detachListener(this.el, 'keyup', this.__onKeyUp);
  };

  this.setDefaultHandler = function(handler) {
    this.defaultHandler = handler;
  };

  // Bind a handler for a key combination.
  // -----
  // Only key combinations with modifiers and a regular key.
  // Examples:
  // bind('ctrl', 'shift', 'r', myhandler);
  // TODO: I want to get rid of the type. Instead introduce an abstraction
  // that triggers key repetition using only one handler
  this.bind0 = function(combination, type, handler) {

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

  this.pass = function(combination) {
    this.bind0(combination, "keyup", PASS);
    this.bind0(combination, "keydown", PASS);
    this.bind0(combination, "keypress", PASS);
  };

};
ChromeKeyboard.prototype = new ChromeKeyboard.Prototype();

module.exports = ChromeKeyboard;
