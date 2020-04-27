(function() {

  var root = this;
  var previousApp = root.App || {};
  var warn = function() {
    return [
      'Your download is in progress. If you leave this page you will lose',
      ' your download and still be charged.'
      ].join('');
  };

  var App = root.App = function(model) {

    this.domElement = document.createElement('div');
    this.domElement.classList.add('typatone');
    this.$ = { domElement: $(this.domElement), body: $(document.body) };

    this.model = model || new App.Models.Message();
    this.published = this.model.get('published');

    this.view = (_.isObject(model) && this.published)
      ? new Viewer(App.LineHeight) : new Editor(App.LineHeight);

    this.view.set({
      timestamp: this.model.get('timestamp'),
      message: this.model.get('message') || ''
    });

    this.modal = new Modal();

    this.view.appendTo(this.domElement);
    this.modal.appendTo(this.domElement)

    this.elems = {
      send: document.createElement('div'),
      embed: document.createElement('div'),
      paste: document.createElement('div')
    };

    this.elems.send.innerHTML = App.Templates.send;
    this.elems.embed.innerHTML = App.Templates.embed;
    this.elems.paste.innerHTML = App.Templates.paste;

    $(this.elems.paste).find('button.submit')
      .bind('click', _.bind(function(e) {

        e.preventDefault();

        var domElement = $(this.elems.paste).find('#paste-text');

        if (domElement.hasClass('pasting')) {
          return;
        }

        domElement.addClass('pasting');
        $(this.elems.paste).find('button').html('Pasting');

        var message = $(this.elems.paste).find('textarea').val();
        this.view.paste(message, _.bind(function() {
          this.modal.hide(function() {
            domElement.removeClass('pasting');
          });
        }, this));

      }, this));

    if (window.StripeCheckout) {
      this.stripe = StripeCheckout.configure({
        // key: 'pk_nEY3eJn3MpRaYEFn1uIIo9r4v2ZBn',  // Test
        key: 'pk_CXwyIe4VUg0shZYnxHGyqaM6m5eM2',  // Live
        image: '/images/typatone-square-blank.png',
        token: _.bind(function(token) {

          var callback = _.bind(function(resp) {
            if (_.isFunction(this._chargeHandler)) {
              this._chargeHandler(resp);
            }
          }, this);

          _.extend(token, App.Payments.Info);
          window.onbeforeunload = warn;

          $.post('https://us-central1-jono-fyi.cloudfunctions.net/charge/',
            token, callback);

        }, this)

      });
    }

    this.view
      .bind(Viewer.Events.replay, _.bind(function() {

        if (_.isFunction(this.view.replay)) {
          this.view.replay();
          _gaq.push(['_trackEvent', Viewer.Events.replay, 'change', true]);
        }

      }, this))
      .bind(Editor.Events.about, _.bind(function() {

        $('#view-about').appendTo(document.body);
        _.defer(function() {
          $('#view-about').css('opacity', 1);
        });

      }, this))
      .bind(Editor.Events.filter, _.bind(function(elem, forcedIndex) {

        if (elem.classList.contains('in-progress')) {
          return;
        }

        elem.classList.add('in-progress');
        var index = _.isUndefined(forcedIndex)
          ? Sequencer.Palette.index + 1 : forcedIndex;

        _gaq.push(['_trackEvent', Editor.Events.filter, 'change', index]);

        Sequencer.load(index, _.bind(function(index) {

          _.each(Sequencer.Palette.list, function(name, i) {
            if (index === i) {
              this.view.$.domElement.addClass(name);
            } else if(this.view.$.domElement.hasClass(name)) {
              this.view.$.domElement.removeClass(name);
            }
          }, this);
          var palette = Sequencer.Palette.list[index];
          this.view.visualization.setColor(Visualization.Colors[palette]);
          elem.classList.remove('in-progress');

        }, this));

      }, this))
      .bind(Editor.Events.paste, _.bind(function() {

          var textarea = $(this.elems.paste).find('textarea').val(
            this.view.getMessage()
          );
          $(this.elems.paste).find('button').html('Paste');

          this.modal.append(this.elems.paste, true);
          this.modal.show(function() {

            if (!has.mobile) {
              textarea.select();
            }

          });

      }, this))
      .bind(Editor.Events.download, _.bind(function(elem) {

        if (!this.view.getMessage()) {
          alert('Hold on there! You need to write something first.');
          return;
        }

        this.charge(function() {

            if (elem.classList.contains('in-progress')) {
              console.warn('Typatone: Already attempting to download.');
              return;
            }

            elem.classList.add('in-progress');

            // TODO: Check if message exists in Cloud Storage. If so,
            // then surface the link. Otherwise export and save like the
            // code below..:

            this.view.sequencer.export(_.bind(function(blob) {
              window.onbeforeunload = null;
              elem.classList.remove('in-progress');
              // TODO: Make UI and save the blob to Cloud Storage through
              // a Google Cloud Function running on typatone.
              Recorder.forceDownload(blob, 'typatone-' + this.view.getMessage(true));
            }, this));

        });

      }, this))
      .bind(Editor.Events.save, _.bind(function(elem) {

        if (!this.view.getMessage()) {
          alert('Hold on there! You need to write something first.');
          return;
        }

        if (elem.classList.contains('in-progress')) {
          return;
        }

        elem.classList.add('in-progress');
        this.save(_.bind(function() {
          this.router.navigate('/m/' + this.model.id, { trigger: false, replace: true });
          elem.classList.remove('in-progress');
        }, this));

      }, this))
      .bind(Editor.Events.send, _.bind(function(elem) {

        if (!this.view.getMessage()) {
          alert('Hold on there! You need to write something first.');
          return;
        }

        if (elem.classList.contains('in-progress')) {
          return;
        }

        elem.classList.add('in-progress');
        this.publish(_.bind(function() {

          this.router.navigate('/m/' + this.model.id, { trigger: false, replace: true });

          var send = $(this.elems.send);
          var url = 'http://typatone.com' + window.location.pathname;// + 'm/' + this.model.id;
          var text = 'Check out this message on Typatone';

          var input = send.find('input')
            .val(url);

          send.find('.facebook').attr('href', 'http://www.facebook.com/sharer.php?u=' + url);
          send.find('.twitter').attr('href', 'https://twitter.com/share?text=' + text + '&url=' + url);
          send.find('.gplus').attr('href', 'https://plus.google.com/share?url=' + url);
          send.find('.email').attr('href', 'mailto:?subject='
              + '[Typatone] A message for you.'
              + '&body=' + text + ': '
              + url
            );

          this.modal.append(this.elems.send, true);
          if (!has.mobile) {
            this.modal.append(this.elems.embed);
            var iframe = '<iframe src="' + url.replace('http\:', '')
              + '" width="320" height="540" frameborder="0" border="0" style="border: 6px solid #ccc; border-radius: 3px;"></iframe>'
            $(this.elems.embed).find('input').val(iframe);
          }
          this.modal.show(function() {
            if (!has.mobile) {  // Select the input on desktop.
              input.scrollLeft(input.outerWidth()).select();
            }
          });

          elem.classList.remove('in-progress');

        }, this));

      }, this));

    this.$.filter = this.view.$.domElement.find('.filter');

    // Load initial audio files

    this.$.body.addClass('loading');
    Sequencer.load(this.model.get('filter') || 0, _.bind(function(index) {

      _.each(Sequencer.Palette.list, function(name, i) {
        if (index === i) {
          this.view.$.domElement.addClass(name);
        } else if(this.view.$.domElement.hasClass(name)) {
          this.view.$.domElement.removeClass(name);
        }
      }, this);

      var palette = Sequencer.Palette.list[index];
      this.view.visualization.setColor(Visualization.Colors[palette]);
      this.view.lerpBPM(this.view.fade.timestamp / 24);

      this.$.body.removeClass('loading');

      setTimeout(function() {
        $('#lobby').css('display', 'none');
      }, 500);

      this.view.trigger('ready');

    }, this));

  };

  _.extend(App, {

    LineHeight: 50,

    Payments: {
      Info: {
        name: 'Typatone â€¢ Download',
        description: 'audio to your computer as a .wav file',
        amount: 99
      }
    },

    Models: {
      Message: Parse.Object.extend('Message'),
      fetch: function(id, callback) {

        var query = new Parse.Query(App.Models.Message);
        query.get(id, {
          success: callback,
          error: callback
        });

        return this;

      }
    },

    Templates: {
      // TODO: Have a mobile check and if not then add embed code.
      send: '<p>Share this message:</p><p class="social"><a class="facebook" href="#" target="_blank"></a><a class="twitter" href="#" target="_blank"></a><a class="gplus" href="#" target="_blank"></a><a class="email" href="#"></a></p><input type="text" id="share-url">',
      embed: '<br /><br /><p>Embed this message:</p><input type="text" id="embed-url">',
      paste: '<div id="paste-text"><p>Paste text from your clipboard:</p><p class="paste-content"><textarea style="resize:vertical; box-shadow: none;"></textarea></p><p><button class="submit"></button></p></div>'
    }

  });

  _.extend(App.prototype, {

    published: false,

    appendTo: function(elem) {
      elem.appendChild(this.domElement);
      return this;
    },

    publish: function(callback) {

      this.published = true;
      this.save(callback);

      _gaq.push(['_trackEvent', Editor.Events.send, 'change', true]);

      return this;

    },

    save: function(callback) {

      var model = this.model;

      if (this.view instanceof Editor) {

        model.save({
          filter: Sequencer.Palette.index,
          published: this.published,
          timestamp: this.view.fade.timestamp,
          message: this.view.getMessage()
        }).then(callback);
        return this;

      }

      callback();
      return this;

    },

    charge: function(callback) {

      if (!this.stripe) {
        return this;
      }

      if (_.isFunction(callback)) {
        this._chargeHandler = callback;
      }

      _gaq.push(['_trackEvent', Editor.Events.download, 'change', true]);

      this.stripe.open(App.Payments.Info);
      return this;

    },

    setRouter: function(router) {
      this.router = router;
      return this;
    }

  });

})();