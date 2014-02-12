"use strict";

/**
 * Note: This implementation has been derived from
 * Craig Campbell's Mousetrap: https://github.com/ccampbell/mousetrap
 * which is licensed under the Apache License.
 */


/**
 * mapping of special keycodes to their corresponding keys
 *
 * everything in this dictionary cannot use keypress events
 * so it has to be here to map to the correct keycodes for
 * keyup/keydown events
 *
 * @type {Object}
 */
var _MAP = {
    8: 'backspace',
    9: 'tab',
    13: 'enter',
    16: 'shift',
    17: 'ctrl',
    18: 'alt',
    20: 'capslock',
    27: 'esc',
    32: 'space',
    33: 'pageup',
    34: 'pagedown',
    35: 'end',
    36: 'home',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    45: 'ins',
    46: 'del',
    91: 'meta',
    93: 'meta',
    224: 'meta'
};

/**
 * mapping for special characters so they can support
 *
 * this dictionary is only used incase you want to bind a
 * keyup or keydown event to one of these keys
 *
 * @type {Object}
 */
var _KEYCODE_MAP = {
    106: '*',
    107: '+',
    109: '-',
    110: '.',
    111 : '/',
    186: ';',
    187: '=',
    188: ',',
    189: '-',
    190: '.',
    191: '/',
    192: '`',
    219: '[',
    220: '\\',
    221: ']',
    222: '\''
};

/**
 * this is a mapping of keys that require shift on a US keypad
 * back to the non shift equivelents
 *
 * this is so you can use keyup events with these keys
 *
 * note that this will only work reliably on US keyboards
 *
 * @type {Object}
 */
var _SHIFT_MAP = {
    '~': '`',
    '!': '1',
    '@': '2',
    '#': '3',
    '$': '4',
    '%': '5',
    '^': '6',
    '&': '7',
    '*': '8',
    '(': '9',
    ')': '0',
    '_': '-',
    '+': '=',
    ':': ';',
    '\"': '\'',
    '<': ',',
    '>': '.',
    '?': '/',
    '|': '\\'
};

/**
 * this is a list of special strings you can use to map
 * to modifier keys when you specify your keyboard shortcuts
 *
 * @type {Object}
 */
var _SPECIAL_ALIASES = {
    'option': 'alt',
    'command': 'meta',
    'return': 'enter',
    'escape': 'esc',
    'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
};

/**
 * loop through the f keys, f1 to f19 and add them to the map
 * programatically
 */
for (var i = 1; i < 20; ++i) {
    _MAP[111 + i] = 'f' + i;
}

/**
 * loop through to map numbers on the numeric keypad
 */
for (i = 0; i <= 9; ++i) {
    _MAP[i + 96] = i;
}

/**
 * cross browser add event method
 *
 * @param {Element|HTMLDocument} object
 * @param {string} type
 * @param {Function} callback
 * @returns void
 */
function _attachListener(object, type, callback) {
  if (object.addEventListener) {
    object.addEventListener(type, callback, false);
  } else {
    object.attachEvent('on' + type, callback);
  }
}

function _detachListener(object, type, callback) {
  if (object.removeEventListener) {
    object.removeEventListener(type, callback, false);
  } else {
    object.detachEvent('on' + type, callback);
  }
}

/**
 * takes the event and returns the key character
 *
 * @param {Event} e
 * @return {string}
 */
function _characterFromEvent(e) {

  // for keypress events we should return the character as is
  if (e.type == 'keypress') {
    var character = String.fromCharCode(e.which);

    // if the shift key is not pressed then it is safe to assume
    // that we want the character to be lowercase.  this means if
    // you accidentally have caps lock on then your key bindings
    // will continue to work
    //
    // the only side effect that might not be desired is if you
    // bind something like 'A' cause you want to trigger an
    // event when capital A is pressed caps lock will no longer
    // trigger the event.  shift+a will though.
    if (!e.shiftKey) {
        character = character.toLowerCase();
    }

    return character;
  }

  // for non keypress events the special maps are needed
  if (_MAP[e.which]) {
    return _MAP[e.which];
  }

  if (_KEYCODE_MAP[e.which]) {
    return _KEYCODE_MAP[e.which];
  }

  // if it is not in the special map

  // with keydown and keyup events the character seems to always
  // come in as an uppercase character whether you are pressing shift
  // or not.  we should make sure it is always lowercase for comparisons
  return String.fromCharCode(e.which).toLowerCase();
}

/**
 * checks if two arrays are equal
 *
 * @param {Array} modifiers1
 * @param {Array} modifiers2
 * @returns {boolean}
 */
function _modifiersMatch(modifiers1, modifiers2) {
  return modifiers1.sort().join(',') === modifiers2.sort().join(',');
}

/**
 * takes a key event and figures out what the modifiers are
 *
 * @param {Event} e
 * @returns {Array}
 */
function _eventModifiers(e) {
  var modifiers = [];

  if (e.shiftKey) {
      modifiers.push('shift');
  }

  if (e.altKey) {
      modifiers.push('alt');
  }

  if (e.ctrlKey) {
      modifiers.push('ctrl');
  }

  if (e.metaKey) {
      modifiers.push('meta');
  }

  return modifiers;
}

/**
 * determines if the keycode specified is a modifier key or not
 *
 * @param {string} key
 * @returns {boolean}
 */
function _isModifier(key) {
  return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
}

/**
 * Converts from a string key combination to an array
 *
 * @param  {string} combination like "command+shift+l"
 * @return {Array}
 */
function _keysFromString(combination) {
  if (combination === '+') {
      return ['+'];
  }

  return combination.split('+');
}

var Keyboard = function(keymap) {
  /**
   * variable to store the flipped version of _MAP from above
   * needed to check if we should use keypress or not when no action
   * is specified
   *
   * @type {Object|undefined}
   */
  this._REVERSE_MAP = {};

  /**
   * a list of all the callbacks setup via Keyboard.bind()
   *
   * @type {Object}
   */
  this._callbacks = {};

  /**
   * direct map of string combinations to callbacks used for trigger()
   *
   * @type {Object}
   */
  this._directMap = {};

  /**
   * keeps track of what level each sequence is at since multiple
   * sequences can start out with the same sequence
   *
   * @type {Object}
   */
  this._sequenceLevels = {};

  /**
   * variable to store the setTimeout call
   *
   * @type {null|number}
   */
  this._resetTimer = null;

  /**
   * temporary state where we will ignore the next keyup
   *
   * @type {boolean|string}
   */
  this._ignoreNextKeyup = false;

  /**
   * temporary state where we will ignore the next keypress
   *
   * @type {boolean}
   */
  this._ignoreNextKeypress = false;

  /**
   * are we currently inside of a sequence?
   * type of action ("keyup" or "keydown" or "keypress") or false
   *
   * @type {boolean|string}
   */
  this._nextExpectedAction = false;

  this._handler = this._handleKeyEvent.bind(this);

  this.keymap = keymap;
};

Keyboard.Prototype = function() {

  /**
   * resets all sequence counters except for the ones passed in
   *
   * @param {Object} doNotReset
   * @returns void
   */
  function _resetSequences(doNotReset) {
      doNotReset = doNotReset || {};

      var activeSequences = false,
          key;

      for (key in this._sequenceLevels) {
          if (doNotReset[key]) {
              activeSequences = true;
              continue;
          }
          this._sequenceLevels[key] = 0;
      }

      if (!activeSequences) {
          this._nextExpectedAction = false;
      }
  }

  /**
   * finds all callbacks that match based on the keycode, modifiers,
   * and action
   *
   * @param {string} character
   * @param {Array} modifiers
   * @param {Event|Object} e
   * @param {string=} sequenceName - name of the sequence we are looking for
   * @param {string=} combination
   * @param {number=} level
   * @returns {Array}
   */
  function _getMatches(character, modifiers, e, sequenceName, combination, level) {
      var i,
          callback,
          matches = [],
          action = e.type;

      // if there are no events related to this keycode
      if (!this._callbacks[character]) {
          return [];
      }

      // if a modifier key is coming up on its own we should allow it
      if (action == 'keyup' && _isModifier(character)) {
          modifiers = [character];
      }

      // loop through all callbacks for the key that was pressed
      // and see if any of them match
      for (i = 0; i < this._callbacks[character].length; ++i) {
          callback = this._callbacks[character][i];

          // if a sequence name is not specified, but this is a sequence at
          // the wrong level then move onto the next match
          if (!sequenceName && callback.seq && this._sequenceLevels[callback.seq] != callback.level) {
              continue;
          }

          // if the action we are looking for doesn't match the action we got
          // then we should keep going
          if (action != callback.action) {
              continue;
          }

          // if this is a keypress event and the meta key and control key
          // are not pressed that means that we need to only look at the
          // character, otherwise check the modifiers as well
          //
          // chrome will not fire a keypress if meta or control is down
          // safari will fire a keypress if meta or meta+shift is down
          // firefox will fire a keypress if meta or control is down
          if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

              // when you bind a combination or sequence a second time it
              // should overwrite the first one.  if a sequenceName or
              // combination is specified in this call it does just that
              //
              // @todo make deleting its own method?
              var deleteCombo = !sequenceName && callback.combo == combination;
              var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
              if (deleteCombo || deleteSequence) {
                  this._callbacks[character].splice(i, 1);
              }

              matches.push(callback);
          }
      }

      return matches;
  }

  /**
   * actually calls the callback function
   *
   * if your callback function returns false this will use the jquery
   * convention - prevent default and stop propogation on the event
   *
   * @param {Function} callback
   * @param {Event} e
   * @returns void
   */
  function _fireCallback(callback, e, combo) {

    // if this event should not happen stop here
    if (this.NOT_IN_EDITABLES && this.stopCallback(e, e.target || e.srcElement, combo)) {
         return;
    }

    if (callback.call(callback.self, e, combo) === false) {
      if (e.preventDefault) {
        e.preventDefault();
      }

      if (e.stopPropagation) {
        e.stopPropagation();
      }

      e.returnValue = false;
      e.cancelBubble = true;
    }
  }

  /**
   * handles a character key event
   *
   * @param {string} character
   * @param {Array} modifiers
   * @param {Event} e
   * @returns void
   */
  this.handleKey = function (character, modifiers, e) {
    var callbacks = _getMatches.call(this, character, modifiers, e),
        i,
        doNotReset = {},
        maxLevel = 0,
        processedSequenceCallback = false;

    // Calculate the maxLevel for sequences so we can only execute the longest callback sequence
    for (i = 0; i < callbacks.length; ++i) {
      if (callbacks[i].seq) {
          maxLevel = Math.max(maxLevel, callbacks[i].level);
      }
    }

    // loop through matching callbacks for this key event
    for (i = 0; i < callbacks.length; ++i) {

      // fire for all sequence callbacks
      // this is because if for example you have multiple sequences
      // bound such as "g i" and "g t" they both need to fire the
      // callback for matching g cause otherwise you can only ever
      // match the first one
      if (callbacks[i].seq) {

        // only fire callbacks for the maxLevel to prevent
        // subsequences from also firing
        //
        // for example 'a option b' should not cause 'option b' to fire
        // even though 'option b' is part of the other sequence
        //
        // any sequences that do not match here will be discarded
        // below by the _resetSequences call
        if (callbacks[i].level != maxLevel) {
            continue;
        }

        processedSequenceCallback = true;

        // keep a list of which sequences were matches for later
        doNotReset[callbacks[i].seq] = 1;
        _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
        continue;

      } else if (Keyboard.TRIGGER_PREFIX_COMBOS) {
        // HACK: Mousetrap does not trigger 'prefixes'
        _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
      } else {
        // if there were no sequence matches but we are still here
        // that means this is a regular match so we should fire that
        if (!processedSequenceCallback) {
            _fireCallback.call(this, callbacks[i].callback, e, callbacks[i].combo);
        }
      }
    }

    // if the key you pressed matches the type of sequence without
    // being a modifier (ie "keyup" or "keypress") then we should
    // reset all sequences that were not matched by this event
    //
    // this is so, for example, if you have the sequence "h a t" and you
    // type "h e a r t" it does not match.  in this case the "e" will
    // cause the sequence to reset
    //
    // modifier keys are ignored because you can have a sequence
    // that contains modifiers such as "enter ctrl+space" and in most
    // cases the modifier key will be pressed before the next key
    //
    // also if you have a sequence such as "ctrl+b a" then pressing the
    // "b" key will trigger a "keypress" and a "keydown"
    //
    // the "keydown" is expected when there is a modifier, but the
    // "keypress" ends up matching the _nextExpectedAction since it occurs
    // after and that causes the sequence to reset
    //
    // we ignore keypresses in a sequence that directly follow a keydown
    // for the same character
    var ignoreThisKeypress = e.type == 'keypress' && this._ignoreNextKeypress;
    if (e.type == this._nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
        _resetSequences.call(this, doNotReset);
    }

    this._ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';

    // provide information about if there have callbacks detected
    // E.g., this is used to trigger a default key handler in case of no others did match
    return callbacks.length > 0;
  };

  /**
   * handles a keydown event
   *
   * @param {Event} e
   * @returns void
   */
  this._handleKeyEvent = function(e) {

    // normalize e.which for key events
    // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
    if (typeof e.which !== 'number') {
        e.which = e.keyCode;
    }

    var character = _characterFromEvent(e);

    // no character found then stop
    if (!character) {
      return;
    }

    // need to use === for the character check because the character can be 0
    if (e.type == 'keyup' && this._ignoreNextKeyup === character) {
      this._ignoreNextKeyup = false;
      return;
    }

    this.handleKey(character, _eventModifiers(e), e);
  };

  /**
   * Gets info for a specific key combination
   *
   * @param  {string} combination key combination ("command+s" or "a" or "*")
   * @param  {string=} action
   * @returns {Object}
   */
  function _getKeyInfo(combination, action) {
    var keys,
        key,
        i,
        modifiers = [];

    // take the keys from this pattern and figure out what the actual
    // pattern is all about
    keys = _keysFromString(combination);

    for (i = 0; i < keys.length; ++i) {
      key = keys[i];

      // normalize key names
      if (_SPECIAL_ALIASES[key]) {
          key = _SPECIAL_ALIASES[key];
      }

      // if this is not a keypress event then we should
      // be smart about using shift keys
      // this will only work for US keyboards however
      if (action && action != 'keypress' && _SHIFT_MAP[key]) {
          key = _SHIFT_MAP[key];
          modifiers.push('shift');
      }

      // if this key is a modifier then add it to the list of modifiers
      if (_isModifier(key)) {
          modifiers.push(key);
      }
    }

    // depending on what the key combination is
    // we will try to pick the best event for it
    action = _pickBestAction.call(this, key, modifiers, action);

    return {
      key: key,
      modifiers: modifiers,
      action: action
    };
  }

  /**
   * binds a single keyboard combination
   *
   * @param {string} combination
   * @param {Function} callback
   * @param {string=} action
   * @param {string=} sequenceName - name of sequence if part of sequence
   * @param {number=} level - what part of the sequence the command is
   * @returns void
   */
  function _bindSingle(combination, callback, action, sequenceName, level) {

    // store a direct mapped reference for use with Keyboard.trigger
    this._directMap[combination + ':' + action] = callback;

    // make sure multiple spaces in a row become a single space
    combination = combination.replace(/\s+/g, ' ');

    var sequence = combination.split(' '),
        info;

    // if this pattern is a sequence of keys then run through this method
    // to reprocess each pattern one key at a time
    if (sequence.length > 1) {
      _bindSequence.call(this, combination, sequence, callback, action);
      return;
    }

    info = _getKeyInfo.call(this, combination, action);

    // make sure to initialize array if this is the first time
    // a callback is added for this key
    this._callbacks[info.key] = this._callbacks[info.key] || [];

    // remove an existing match if there is one
    _getMatches.call(this, info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

    // add this call back to the array
    // if it is a sequence put it at the beginning
    // if not put it at the end
    //
    // this is important because the way these are processed expects
    // the sequence ones to come first
    this._callbacks[info.key][sequenceName ? 'unshift' : 'push']({
      callback: callback,
      modifiers: info.modifiers,
      action: info.action,
      seq: sequenceName,
      level: level,
      combo: combination
    });
  }

  /**
   * binds multiple combinations to the same callback
   *
   * @param {Array} combinations
   * @param {Function} callback
   * @param {string|undefined} action
   * @returns void
   */
  function _bindMultiple(combinations, callback, action) {
    for (var i = 0; i < combinations.length; ++i) {
      _bindSingle.call(this, combinations[i], callback, action);
    }
  }


  /**
   * called to set a 1 second timeout on the specified sequence
   *
   * this is so after each key press in the sequence you have 1 second
   * to press the next key before you have to start over
   *
   * @returns void
   */
  function _resetSequenceTimer() {
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(_resetSequences.bind(this), 1000);
  }

  /**
   * reverses the map lookup so that we can look for specific keys
   * to see what can and can't use keypress
   *
   * @return {Object}
   */
  function _getReverseMap() {
    if (!this._REVERSE_MAP) {
      this._REVERSE_MAP = {};
      for (var key in _MAP) {

        // pull out the numeric keypad from here cause keypress should
        // be able to detect the keys from the character
        if (key > 95 && key < 112) {
          continue;
        }

        if (_MAP.hasOwnProperty(key)) {
          this._REVERSE_MAP[_MAP[key]] = key;
        }
      }
    }
    return this._REVERSE_MAP;
  }

  /**
   * picks the best action based on the key combination
   *
   * @param {string} key - character for key
   * @param {Array} modifiers
   * @param {string=} action passed in
   */
  function _pickBestAction(key, modifiers, action) {

    // if no action was picked in we should try to pick the one
    // that we think would work best for this key
    if (!action) {
      action = _getReverseMap.call(this)[key] ? 'keydown' : 'keypress';
    }

    // modifier keys don't work as expected with keypress,
    // switch to keydown
    if (action == 'keypress' && modifiers.length) {
      action = 'keydown';
    }

    return action;
  }

  /**
   * binds a key sequence to an event
   *
   * @param {string} combo - combo specified in bind call
   * @param {Array} keys
   * @param {Function} callback
   * @param {string=} action
   * @returns void
   */
  function _bindSequence(combo, keys, callback, action) {

    var that = this;

    // start off by adding a sequence level record for this combination
    // and setting the level to 0
    this._sequenceLevels[combo] = 0;

    /**
     * callback to increase the sequence level for this sequence and reset
     * all other sequences that were active
     *
     * @param {string} nextAction
     * @returns {Function}
     */
    function _increaseSequence(nextAction) {
      return function() {
        that._nextExpectedAction = nextAction;
        ++that._sequenceLevels[combo];
        _resetSequenceTimer.call(that);
      };
    }

    /**
     * wraps the specified callback inside of another function in order
     * to reset all sequence counters as soon as this sequence is done
     *
     * @param {Event} e
     * @returns void
     */
    function _callbackAndReset(e) {
      _fireCallback.call(this, callback, e, combo);

      // we should ignore the next key up if the action is key down
      // or keypress.  this is so if you finish a sequence and
      // release the key the final key will not trigger a keyup
      if (action !== 'keyup') {
        this._ignoreNextKeyup = _characterFromEvent(e);
      }

      // weird race condition if a sequence ends with the key
      // another sequence begins with
      setTimeout(_resetSequences.bind(this), 10);
    }

    // loop through keys one at a time and bind the appropriate callback
    // function.  for any key leading up to the final one it should
    // increase the sequence. after the final, it should reset all sequences
    //
    // if an action is specified in the original bind call then that will
    // be used throughout.  otherwise we will pass the action that the
    // next key in the sequence should match.  this allows a sequence
    // to mix and match keypress and keydown events depending on which
    // ones are better suited to the key provided
    for (var i = 0; i < keys.length; ++i) {
        var isFinal = i + 1 === keys.length;
        var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence.call(this, action || _getKeyInfo(keys[i + 1]).action);
        _bindSingle.call(this, keys[i], wrappedCallback, action, combo, i);
    }
  }

  /**
   * binds an event to mousetrap
   *
   * can be a single key, a combination of keys separated with +,
   * an array of keys, or a sequence of keys separated by spaces
   *
   * be sure to list the modifier keys first to make sure that the
   * correct key ends up getting bound (the last key in the pattern)
   *
   * @param {string|Array} keys
   * @param {Function} callback
   * @param {string=} action - 'keypress', 'keydown', or 'keyup'
   * @returns void
   */
  this.bind = function(keys, callback, action, self) {
    callback.self = self;
    keys = (keys instanceof Array) ? keys : [keys];
    _bindMultiple.call(this, keys, callback, action);
    return this;
  };

  this.bindMapped = function(alias, callback, action, self) {
    return this.bind(this.keymap[alias], callback, action, self);
  };

  /**
   * triggers an event that has already been bound
   *
   * @param {string} keys
   * @param {string=} action
   * @returns void
   */
  this.trigger = function(keys, action) {
    if (this._directMap[keys + ':' + action]) {
      this._directMap[keys + ':' + action].call(this, {}, keys);
    }
    return this;
  };

  /**
   * resets the library back to its initial state.  this is useful
   * if you want to clear out the current keyboard shortcuts and bind
   * new ones - for example if you switch to another page
   *
   * @returns void
   */
  this.reset = function() {
    this._callbacks = {};
    this._directMap = {};
    return this;
  };

  /**
  * should we stop this event before firing off callbacks
  *
  * @param {Event} e
  * @param {Element} element
  * @return {boolean}
  */
  this.stopCallback = function(e, element) {
    // if the element has the class "mousetrap" then no need to stop
    if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
      return false;
    }

    // stop for input, select, and textarea
    return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || (element.contentEditable && element.contentEditable == 'true');
  };

  this.connect = function(el) {
    _attachListener(el, 'keypress', this._handler);
    _attachListener(el, 'keydown', this._handler);
    _attachListener(el, 'keyup', this._handler);
  };

  this.disconnect = function(el) {
    _detachListener(el, 'keypress', this._handler);
    _detachListener(el, 'keydown', this._handler);
    _detachListener(el, 'keyup', this._handler);
  };

  /**
   * Trigger callbacks for combos even when they are part of sequnence.
   */
  this.TRIGGER_PREFIX_COMBOS = false;
  this.NOT_IN_EDITABLES = false;
};

Keyboard.prototype = new Keyboard.Prototype();

module.exports = Keyboard;
