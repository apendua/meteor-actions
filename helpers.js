
if (typeof Handlebars !== 'undefined') {

  var specialKeys = ['__content', '__elseContent'];
  
  var defaults = {
    title: function () {
      var title = this.title;
      if (_.isFunction(title))
        title = title.call(this, arguments);
      return title || 'undefined';
    },
  };

  Template.actionLink.helpers(defaults);
  Template.actionButton.helpers(defaults);

  // TODO: DRY

  Handlebars.registerHelper('forEachAction', function (actions, options) {
    if (options === undefined) {
      options = actions;
      actions = Meteor.actions.find(_.omit(options.hash, specialKeys));
    }
    return UI.Each.extend({ data: actions,
      __content: options.hash.__content,
      __elseContent: options.hash.__elseContent,
    });
  });

  Handlebars.registerHelper('actionsAsButtons', function (actions, options) {
    if (options === undefined) {
      options = actions;
      actions = Meteor.actions.find(_.omit(options.hash, specialKeys));
    }
    return UI.Each.extend({ data: actions,
      __content: Template.actionButton,
    });
  });

  UI.Component.listenTo = function (action, callback) {
    this.events({
      'click [data-action]': function (event, template) {
        var self = this,
            args = _.toArray(arguments);
        if (this._id === action._id) {
          callback.apply(self, args);
        }
      }
    });
  }
  
}
/*
  var createActionLandmark = function (action, options) {
    var parentData = this;
    var wrapEventMap = function (oldEventMap) {
      var newEventMap = {};
      _.each(oldEventMap, function (handlers, key) {
        newEventMap[key] = _.map(handlers, function (handler) {
          return function (event) {
            // check if event target was disabled
            if (!$(event.target).prop('disabled'))
              return handler.call(parentData, event, action);
          };
        });
      });
      return newEventMap;
    };

    var proxyAction = {};
    _.each(action, function (helepr, key) {
      if (_.isFunction(helepr) && key !== 'validate' && key !== 'perform')
        proxyAction[key] = function () {
          return helepr.call(parentData, action);
        }
      else proxyAction[key] = helepr;
    });

    return Spark.createLandmark({
      rendered: function () {
        //TODO: implement hide
        var nodes = this.findAll('[data-disabled="true"]');
        $(nodes).addClass('disabled').prop('disabled', true)
          .filter('a').parent().filter('li').addClass('disabled');
      },
    }, function () { // landmark
      var html = Spark.isolate(_.bind(options.fn, null, proxyAction));
      return Spark.attachEvents(wrapEventMap(Actions._events[action._id]), html);
    });
  };

  var renderActions = function (actionList, options) {
    var parentData = this;

    if (!(actionList && 'observeChanges' in actionList)) {
      if (actionList && actionList.length > 0) {
        return _.map(actionList, function (action) {
          return Spark.labelBranch(
            (action && action._id) || Spark.UNIQUE_LABEL, function () {
              var html = createActionLandmark.call(parentData, action, options);
              return Spark.setDataContext(action, html);
            });
        }).join('');
      } else
        return Spark.labelBranch('else', function () {
          return options.inverse ? options.inverse(parentData) : '';
        });
    }

    return Spark.list(
      actionList,
      function (action) {
        return Spark.labelBranch(
          (action && action._id) || Spark.UNIQUE_LABEL, function () {
            var html = createActionLandmark.call(parentData, action, options);
            return Spark.setDataContext(action, html);
          });
      },
      function () {
        //TODO: inject parent data
        return options.inverse ? Spark.isolate(options.inverse) : '';
      }
    );
  };
*/
