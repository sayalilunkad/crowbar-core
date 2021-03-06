/**
 * Copyright 2011-2013, Dell
 * Copyright 2013-2014, SUSE LINUX Products GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
;(function($, doc, win) {
  'use strict';

  function LedUpdate(el, options) {
    this.$el = $(el);

    this.defaults = {
      beforeProcess: null,
      afterProcess: null
    };

    this.options = $.extend(
      this.defaults,
      options
    );

    this.init();
  }

  LedUpdate.prototype.init = function() {
    var self = this;

    self.process();

    if ($.queryString['nopoll'] == undefined) {
      setInterval(
        function() {
          self.process()
        },
        30000
      );
    }
  };

  LedUpdate.prototype.processGroups = function(response, ignores) {
    var self   = this;
    var reload = false;
    $('[data-group]').each(function(index, current) {
      var current_handle = $(current).data('group');

      if (!response.groups[current_handle]) {
        reload = true;
      }
    });

    if (self.$el.data('ledsingle') == undefined) {
      $.each(response.groups, function(key, val) {
        var current = $(
          '[data-group="{0}"] [data-piechart]'.format(key)
        );

        if (current.length > 0) {
          var chartVals = [
            val.status.ready,
            val.status.failed,
            val.status.unknown,
            val.status.crowbar_upgrade,
            val.status.unready + val.status.pending
          ];

          current.attr('title', val.tooltip).tooltip('destroy').tooltip({
            html: true
          });

          current.sparkline(
            chartVals,
            {
              type: 'pie',
              tagValuesAttribute: 'data-piechart',
              disableTooltips: true,
              disableHighlight: true,
              sliceColors: [
                '#00C081',
                '#DC3545',
                '#797777',
                '#FFBB06'
              ]
            }
          );
        } else {
          reload = true;
        }
      });
    }
    self.conditionalReload(reload);
  };

  LedUpdate.prototype.processNodes = function(response, ignores) {
    var self = this;
    var reload = false;

    $('[data-node]').each(function(index, current) {
      var current_handle = $(current).data('node');

      // Node in page not found in response, reload
      if (!response.nodes[current_handle]) {
        reload = true;
      }
    });

    if (self.$el.data('ledsingle') == undefined) {
      $.each(response.nodes, function(key, val) {
        var current = $(
          '[data-node="{0}"]'.format(key)
        );

        // Node in response not found in page, reload
        if (current.length == 0) {
          reload = true;
        } else {
          if(current.hasClass('unknown')) {
            self.update(
              current,
              val.class,
              val.status
            );
          } else {
            self.update(
              current,
              val.class,
              val.status,
              function() {
                current.effect('fade').effect('fade');
              }
            );
          }

          var text = $(
            '[data-node-state="{0}"]'.format(key)
          );

          if (text.html() != val.status) {
            text.html(val.status).effect('fade').effect('fade');
          }
        }
      });
    }

    self.conditionalReload(reload);
  };

  LedUpdate.prototype.processProposals = function(response, ignores) {
    var self = this;
    $.each(response.proposals, function(key, val) {
      var current = $(
        '#{0}'.format(key)
      );

      if(current.hasClass('unknown')) {
        self.update(
          current,
          val,
          response['i18n'][key]['status']
        );
      } else {
        self.update(
          current,
          val,
          response['i18n'][key]['status'],
          function() {
            current.effect('fade').effect('fade');
          }
        );
      }
    });
  };

  LedUpdate.prototype.conditionalReload = function(reload) {
    var self = this;
    if (reload && self.$el.data('ledreload') != false) {
      if (self.$el.data('ledredirect')) {
        win.location = self.$el.data('ledredirect');
      } else {
        win.location.reload();
      }
    }
  };

  LedUpdate.prototype.processResponse = function(response, ignores) {
    var self = this;
    var reload = false;

    if ($.isFunction(self.options.beforeProcess)) {
      self.options.beforeProcess.call(this, response);
    }

    if (response.groups && $.inArray("groups", ignores) < 0) {
      self.processGroups(response, ignores);
    }

    if (response.nodes && $.inArray("nodes", ignores) < 0) {
      self.processNodes(response, ignores);
    }

    if (response.proposals && $.inArray("proposals", ignores) < 0) {
      self.processProposals(response, ignores);
    }

    if ($.isFunction(self.options.afterProcess)) {
      self.options.afterProcess.call(this, response);
    }
  };

  LedUpdate.prototype.process = function() {
    var self = this;

    var ignores = [];
    if (this.$el.data('ledignore')) {
      ignores = this.$el.data('ledignore').split(',');
    }

    try {
      $.getJSON(this.$el.data('ledupdate'), function(response) { self.processResponse(response, ignores); });
    } catch(e) {
      if (win.console) {
        console.log(e)
      }
    }
  };

  LedUpdate.prototype.update = function(element, clazz, title, callback) {
    if (!element.hasClass(clazz)) {
      element.attr(
        'title',
        title
      );

      element.attr(
        'class',
        'led {0}'.format(clazz)
      );

      if ($.isFunction(callback)) {
        callback.call();
      }
    }
  };

  $.fn.ledUpdate = function(options) {
    return this.each(function() {
      new LedUpdate(this, options);
    });
  };
}(jQuery, document, window));
