Commander
========

A command mapper for `Substance.Views`.

- `Command.Keyboard` is a keyboard event mapper based on Mousetrap and inspired by Sublime.


## Command.Keyboard


Keyboard mappings are defined from an application commands' perspective.
Commands can be specified including arguments and are bound to keys or sequences of keys.
The key bindings are context sensitiv, i.e., only key bindings would be active that are bound
to a context that is in the hierarchy of a currently active view.

  {
    // global key bindings
    "commands": [
      {"command": "quit", "keys": ["cmd-q"]},
      {"command": "execute", "args": ["log", "Hello"], "keys": ["cmd-x"]}
    ],

    contexts: {
      // bindings for view `app`
      "app": {
        "commands": [
          {"command": "open-dashboard", "keys": ["cmd+d"], "args": ["my_documents"] }
        ],

        "contexts": {

          "composer": {
            "commands": [
              {"command": "move-cursor", "keys": ["left"], "args": ["left"] }
            ]
          }
        }
      }
    }
  }
