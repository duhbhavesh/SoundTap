/**
 * @author jonobr1 / http://jonobr1.com
 */
(function() {

  var root = this;
  var previousSound = root.Sound || {};
  var callbacks = [], ctx;

  // Force polyfill for Web Audio
  root.addEventListener('load', function() {
    root.AudioContext = root.AudioContext || root.webkitAudioContext;
    Sound._ready = true;
    if (root.AudioContext) {
      Sound.ctx = ctx = new root.AudioContext();
      Sound.has = true;
      if (!Sound.ctx.createGain) {
        Sound.ctx.createGain = Sound.ctx.createGainNode;
      }
    }
    _.each(callbacks, function(c) {
      c.call(Sound);
    });
    callbacks.length = 0;
  }, false);

  var Sound = root.Sound = function(url, callback) {

    Sound.get(url, _.bind(function(buffer) {

      this.destination = ctx.destination;

      this.buffer = buffer;
      this._ready = true;
      if (_.isFunction(callback)) {
        callback.call(this);
      }
      this.trigger('load');

    }, this));

  };

  _.extend(Sound, {

    _ready: false,

    enabled: false,

    ready: function(func) {
      if (Sound._ready) {
        func.call(Sound);
        return;
      }
      callbacks.push(func);
    },

    noConflict: function() {
      root.Sound = previousAudio;
      return this;
    },

    get: function(url, callback) {
      $.ajax({
        type: 'GET',
        url: url,
        dataType: 'arraybuffer',
        success: function(data) {
          Sound.ready(function() {
            ctx.decodeAudioData(data, function(buffer) {
              if (_.isFunction(callback)) {
                callback(buffer);
              }
            });
          });
        },
        error: function(e) {
          console.log('Error loading', url, e);
        }
      });
    }

  });

  _.extend(Sound.prototype, Backbone.Events, {

    stop: function(options) {

      if (!this.source) {
        return this;
      }

      var params = _.defaults(options || {}, {
        time: ctx.currentTime
      });

      if (params.destination) {
        this.destination = params.destination;
      }

      this.source.stop(params.time);
      this.source.disconnect(this.destination);
      return this;

    },

    play: function(options) {

      var params = _.defaults(options || {}, {
        time: ctx.currentTime,
        loop: false
      });

      if (ctx && /suspended/.test(ctx.state)) {
        ctx.resume();
      }

      if (params.destination) {
        this.destination = params.destination;
      }

      this.source = ctx.createBufferSource();
      this.source.buffer = this.buffer;
      this.source.connect(this.destination);
      this.source.loop = params.loop;

      if (_.isFunction(this.source.start)) {
        this.source.start(params.time);
      } else if (_.isFunction(this.source.noteOn)) {
        this.source.noteOn(params.time);
      }

      return this;

    }

  });

})();