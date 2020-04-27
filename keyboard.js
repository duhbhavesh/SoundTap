/**
 * @author jonobr1 / http://jonobr1.com
 */
(function() {

  var root = this;
  var previousKeyboard = root.Keyboard || {};
  navigator.vibrate = navigator.vibrate || _.identity;  // Fallback for iOS

  var SpecialKeys = {
    return: 'return',
    delete: 'delete',
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    space: 'space',
  };

  var Keyboard = root.Keyboard = function(opts) {

    this.$ = {};
    this.buttons = {};

    this.domElement = document.createElement('div');
    this.domElement.classList.add('keyboard');
    this.$.domElement = $(this.domElement);

    this.navigation = document.createElement('ul');
    this.navigation.classList.add('navigation');
    this.navigation.classList.add('row');
    this.$.navigation = $(this.navigation);

    this.board = document.createElement('div');
    this.board.classList.add('board');
    this.$.board = $(this.board);

    this.domElement.appendChild(this.navigation);
    this.domElement.appendChild(this.board);

    this._hideCursor = _.debounce(_.bind(this.hideCursor, this), 250);

    var params = _.defaults(opts || {}, {
      hit: this.domElement
    });

    Keyboard.initialize.call(this, params);

  };

  _.extend(Keyboard, {

    VibrationDuration: 25,

    Events: {
      change: 'change',
      listen: 'listen',
      ignore: 'ignore',
      delimiter: '-'
    },

    AllKeys: [],

    SpecialKeys: SpecialKeys,

    Keys: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', SpecialKeys.delete],
      ['numbers', SpecialKeys.space, SpecialKeys.return]
    ],

    Numbers: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '$', '&', '@'],
      ['shift', '.', ',', '?', '!', 'â€™', 'â€', '', SpecialKeys.delete],
      ['letters', SpecialKeys.space, SpecialKeys.return]
    ],

    Symbols: [
      ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
      ['_', '\\', '|', '~', '<', '>', 'â‚¬', 'Â£', 'Â¥'],
      ['123', '.', ',', '?', '!', 'â€™', 'â€¢', 'm', SpecialKeys.delete],
      ['abc', SpecialKeys.space, SpecialKeys.return]
    ],

    Dictionary: {
      '\n': SpecialKeys.return,
      '\r': SpecialKeys.return,
      ' ': SpecialKeys.space,
      '\'': 'â€™',
      '\"': 'â€'
    },

    Regex: {
      SpecialKeys: /(shift|delete|numbers|space|return|abc)/i
    },

    initialize: function(params) {

      var scope = this;
      var $window = $(window);
      var $domElement = this.$.domElement;

      this.$.domElement.bind('touchstart touchmove touchend touchcancel', function(e) {
        if (Sound.enabled) {
          e.preventDefault();
          return false;
        }
      });

      // Handlers related to `delete`ing text.
      var enabled = false;
      var deleteConstantly = function() {
        if (!enabled) {
          return;
        }
        scope.setKey(Keyboard.SpecialKeys.delete, true);
        setTimeout(deleteConstantly, scope.deletionFrequency);
      };

      _.each(Keyboard.Keys, function(row, i) {

        var ul = document.createElement('ul');
        ul.classList.add('row');
        ul.setAttribute('index', i);

        _.each(row, function(key, j) {

          var li = document.createElement('li');
          li.classList.add('key');
          li.classList.add(key);
          li.setAttribute('row', i);
          li.setAttribute('col', j);
          li.setAttribute('key', key);

          var span = document.createElement('span');
          li.appendChild(span);
          // li.innerHTML = '&nbsp;';

          // Add event listener
          var $li = $(li);

          // Export each button for selection later with `showCursor`
          this.buttons[Keyboard.Keys[i][j]] = li;
          this.buttons[Keyboard.Keys[i][j].toUpperCase()] = li;
          this.buttons[Keyboard.Numbers[i][j]] = li;
          this.buttons[Keyboard.Symbols[i][j]] = li;

          switch (key) {

            case 'shift':
              $li.bind(has.mobile ? 'touchstart' : 'mousedown', _.bind(function(e) {
                if (Sound.enabled) {
                  e.preventDefault();
                }
                this.setUppercase(!this.isUppercase);
                navigator.vibrate(Keyboard.VibrationDuration);
                if (Sound.enabled) {
                  return false;
                }
              }, this));
              break;

            case 'numbers':
              $li.bind(has.mobile ? 'touchstart' : 'mousedown', _.bind(function(e) {
                if (Sound.enabled) {
                  e.preventDefault();
                }
                this.setNumbers(!this.isNumbers);
                navigator.vibrate(Keyboard.VibrationDuration);
                if (Sound.enabled) {
                  return false;
                }
              }, this));
              break;

            case Keyboard.SpecialKeys.space:
            case Keyboard.SpecialKeys.return:
              $li.bind(has.mobile ? 'touchstart' : 'mousedown', function(e) {
                if (Sound.enabled) {
                  e.preventDefault();
                }
                scope.setKey(key, true);
                navigator.vibrate(Keyboard.VibrationDuration);
                if (Sound.enabled) {
                  return false;
                }
              });
              break;

            case Keyboard.SpecialKeys.delete:

              if (has.mobile) {
                $li.bind('touchstart', function(e) {
                  if (Sound.enabled) {
                    e.preventDefault();
                  }
                  enabled = true;
                  scope.setKey(key, true);
                  navigator.vibrate(Keyboard.VibrationDuration);
                  setTimeout(deleteConstantly, scope.deletionFrequency * 10);
                  if (Sound.enabled) {
                    return false;
                  }
                });
              } else {
                $li.bind('mousedown', function(e) {
                  e.preventDefault();
                  enabled = true;
                  scope.setKey(key, true);
                  navigator.vibrate(Keyboard.VibrationDuration);
                  setTimeout(deleteConstantly, scope.deletionFrequency * 10);
                });
              }
              $li
                .bind('touchend touchcancel', function(e) {
                  if (Sound.enabled) {
                    e.preventDefault();
                  }
                  enabled = false;
                  if (Sound.enabled) {
                    return false;
                  }
                })
                .bind('click', function() {
                  enabled = false;
                });
              break;

            default:
              $li.bind(has.mobile ? 'touchstart' : 'mousedown', function(e) {
                if (Sound.enabled) {
                  e.preventDefault();
                }
                scope.setKey(scope.getKey(i, j));
                navigator.vibrate(Keyboard.VibrationDuration);
                if (Sound.enabled) {
                  return false;
                }
              });

          }

          $li.bind('mouseup touchmove touchend touchcancel', function(e) {
            if (Sound.enabled) {
              e.preventDefault();
              return false;
            }
          });

          ul.appendChild(li);

        }, this);

        this.board.appendChild(ul);

      }, this);

      this.cursor = document.createElement('div');
      this.cursor.classList.add('cursor');
      this.$.cursor = $(this.cursor);
      this.cursor.innerHTML = '&nbsp;';

      this.board.appendChild(this.cursor);

      // TODO: Maybe include UI changes based on "shift" and "numbers"
      // selections from the keyboard.

      var keydown = function(e) {

        switch (e.which) {
          case 37:
            e.preventDefault();
            scope.trigger(Keyboard.Events.change, Keyboard.SpecialKeys.left);
            return false;
          case 38:
            e.preventDefault();
            scope.trigger(Keyboard.Events.change, Keyboard.SpecialKeys.up);
            return false;
          case 39:
            e.preventDefault();
            scope.trigger(Keyboard.Events.change, Keyboard.SpecialKeys.right);
            return false;
          case 40:
            scope.trigger(Keyboard.Events.change, Keyboard.SpecialKeys.down);
            return false;
          case 8:  // delete
            e.preventDefault();
            $window.trigger('keypress', [{ which: Keyboard.SpecialKeys.delete }]);
            return false;
        }

      };

      var keypress = function(e, f) {

        e.preventDefault();
        var which = e.which || f && f.which;
        var key = Keyboard.transformKey(which);

        if (!Keyboard.keyExists(key)) {
          return false;
        }

        scope.setKey(key, Keyboard.Regex.SpecialKeys.test(key));
        return false;

      };

      $window.bind('click', function(e) {

        var target = e.target;
        var focus = e.target === params.hit || $.contains(params.hit, target);

        if (focus) {

          if (scope.listening) {
            return;
          }

          $window
            .bind('keydown', keydown)
            .bind('keypress', keypress);

          scope.listening = true;
          scope.trigger(Keyboard.Events.listen);

          return;

        }

        $window
          .unbind('keydown', keydown)
          .unbind('keypress', keypress);

        scope.listening = false;
        scope.trigger(Keyboard.Events.ignore);

      });

    },

    keyExists: function(key) {
      return _.indexOf(Keyboard.AllKeys, key.toLowerCase()) >= 0;
    },

    transformKey: function(key) {
      if (typeof key === 'number') {
        key = String.fromCharCode(key);
      }
      return Keyboard.Dictionary[key] || key;
    }

  });

  _.extend(Keyboard.prototype, Backbone.Events, {

    listening: false,

    isUppercase: false,

    isNumbers: false,

    deletionFrequency: 1000 / 20, // seconds / times

    appendTo: function(elem) {
      elem.appendChild(this.domElement);
      return this;
    },

    getButton: function(key) {
      return this.buttons[key] || null;
    },

    getKey: function(row, col) {

      var map = this.getMap();
      var key = map[row][col];

      if (this.isUppercase && !Keyboard.Regex.SpecialKeys.test(key)) {
        key = key.toUpperCase();
      }

      return key;

    },

    getMap: function() {

      if (this.isNumbers && this.isUppercase) {
        return Keyboard.Symbols;
      }

      if (this.isNumbers) {
        return Keyboard.Numbers;
      }

      return Keyboard.Keys;

    },

    setKey: function(key, invisible) {
      if (!invisible) {
        this.showCursor(key, this.getButton(key));
      }
      this.trigger(Keyboard.Events.change, key);
      // Reset shift in order to avoid 'caps'
      if (this.isUppercase && !this.isNumbers) {
        this.setUppercase(false);
      }
      return this;
    },

    setUppercase: function(b) {

      if (b === this.isUppercase) {
        return this;
      }

      this.isUppercase = !!b;
      this.board.classList[this.isUppercase ? 'add' : 'remove']('uppercase');

      return this;

    },

    setNumbers: function(b) {

      if (b === this.isNumbers) {
        return this;
      }

      this.isNumbers = !!b;

      this.board.classList[this.isNumbers ? 'add' : 'remove']('numbers');
      this.board.classList.remove('uppercase');
      this.isUppercase = false;

      return this;

    },

    showCursor: function(key, elem) {

      var offset = this.board.getBoundingClientRect();
      var rect = elem.getBoundingClientRect();

      this.$.cursor
        .css({
          display: 'block',
          left: (rect.left - offset.left) + 'px',
          top: (rect.top - offset.top) + 'px'
        })
        .html(key);

      this._hideCursor();

      return this;

    },

    hideCursor: function() {

      this.$.cursor.css({
        display: 'none'
      });

      return this;

    },

    add: function(elem, func) {

      var li = document.createElement('li');
      li.classList.add('key');
      li.appendChild(elem);

      this.navigation.appendChild(li);
      var $li = $(li);

      $li.bind('mousedown touchstart', _.bind(function(e) {
        if (Sound.enabled) {
          e.preventDefault();
        }
        func();
        navigator.vibrate(Keyboard.VibrationDuration);
        if (Sound.enabled) {
          return false;
        }
      }, this));

      return this;

    }

  });

  Keyboard.AllKeys = _.flatten(Keyboard.Keys.concat(Keyboard.Numbers).concat(Keyboard.Symbols));

})();