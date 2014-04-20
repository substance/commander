"use strict";

var _ = require("underscore");

var DefaultKeyTable = function() {
};

// TODO: we will just implement different versions of this for different browsers and platforms.
DefaultKeyTable.Prototype = function() {

  var initTable = function() {
    var i;
    this.table = {};

    // alphabet
    for (i = 0; i < 26; i++) {
      var code = i + 65;
      var u = String.fromCharCode(code).toUpperCase();
      var l = String.fromCharCode(code).toLowerCase();
      this.table[u] = code;
      this.table[l] = code;
    }

    // Numbers
    for (i = 0; i < 10; i++) {
      this.table[""+i] = 48 + i;
    }

    // F-keys
    for (i = 1; i < 13; i++) {
      this.table["f"+i] = 111 + i;
    }

    // special characters
    _.extend(this.table, {
      "*": 106,
      "+": 107,
      "-": 109,
      ".": 110,
      "/": 111,
      ";": 186,
      "=": 187,
      ",": 188,
      "`": 192,
      "[": 219,
      "\\": 220,
      "]": 221,
      "\"": 222,
      "special": 229
    });

    // custom aliases
    _.extend(this.table, {
      "backspace": 8,
      "tab": 9,
      "enter": 13,
      "shift": 16,
      "ctrl": 17,
      "alt": 18,
      "capslock": 20,
      "esc": 27,
      "space": 32,
      "pageup": 33,
      "pagedown": 34,
      "end": 35,
      "home": 36,
      "left": 37,
      "up": 38,
      "right": 39,
      "down": 40,
      "ins": 45,
      "del": 46,
    });

    this.inverseTable = {};
    _.each(this.table, function(code, alias) {
      this.inverseTable[code] = alias;
    }, this);

    // console.log("INVERSE TABLE", this.inverseTable);
  }.call(this);

  this.getKeyCode = function(s) {
    if (this.table[s] !== undefined) {
      return this.table[s];
    } else {
      throw new Error("Unknown key: " + s);
    }
  };

  this.getKeyName = function(code) {
    if (this.inverseTable[code] !== undefined) {
      return this.inverseTable[code];
    } else {
      return "native("+code+")";
    }
  };
};
DefaultKeyTable.prototype = new DefaultKeyTable.Prototype();

module.exports = DefaultKeyTable;
