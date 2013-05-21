
if (typeof Handlebars !== 'undefined') {

  //TODO: remove this when it is needed
  Handlebars.registerHelper('actions', function (context, options) {
    if (options === undefined) { options = context; context = this }
    console.log('using actions helper is deprecated');
    return options.fn(context);
  });

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

  Handlebars.registerHelper('eachAction', function (actionList, options) {
    return renderActions(actionList, options);
  });
  
  Handlebars.registerHelper('action', function (action, options) {
    if (_.isObject(action))
      return renderActions.call(this, [action, ], options);
    return '';
  });

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

  Handlebars.registerHelper('actionLink', function (options) {
    var data = this;
    if (options.hash && !_.isEmpty(options.hash))
      data = _.defaults(options.hash, data);
    return new Handlebars.SafeString(Template.actionLink(data));
  });
  
  Handlebars.registerHelper('actionButton', function (options) {
    var data = this;
    if (options.hash && !_.isEmpty(options.hash))
      data = _.defaults(options.hash, data);
    return new Handlebars.SafeString(Template.actionButton(data));
  });
  
}
