
if (typeof Handlebars !== 'undefined') {

  var specialKeys = ['__content', '__elseContent'];

  var freeze = function (component) {
    component.extend = function (options) {
      if (options)
        delete options.__content;
      return UI.Component.extend.call(this, options);
    }
    return component;
  }

  // TODO: use options :)

  var eachWithDynamicConent = function (data, getContent) {
    return UI.Each.extend({ data: data,
      __content: {
        withData: function (data) {
          return getContent(_.isFunction(data) ? data() : data);
        }
      }
    });
  };

  Handlebars.registerHelper('test', function (value, options) {
    if (!value)
      return options.hash.__content;
    return options.hash.__elseContent;
  });

  Handlebars.registerHelper('forEachAction', function (actions, options) {
    if (options === undefined) {
      options = actions;
      actions = Meteor.actions.find(_.omit(options.hash, specialKeys));
    }
    return freeze(
      eachWithDynamicConent(actions, (function (__content) {
        return function (data) {
          return Actions.getUI(data._id).extend({ data : data,
            __content: __content
          });
        };
      }(options.hash.__content)))
    )
  });
  
  Handlebars.registerHelper('actionsAsButtons', function (actions, options) {
    if (options === undefined) {
      options = actions;
      actions = Meteor.actions.find(_.omit(options.hash, specialKeys));
    }
    return eachWithDynamicConent(actions, function (data) {
      return Actions.getUI(data._id).extend({ data : data,
        __content: Template.actionAsButton
      });
    });
  });

  Handlebars.registerHelper('actionsAsListOfLinks', function (actions, options) {
    if (options === undefined) {
      options = actions;
      actions = Meteor.actions.find(_.omit(options.hash, specialKeys));
    }
    return eachWithDynamicConent(actions, function (data) {
      return Actions.getUI(data._id).extend({ data : data,
        __content: Template.actionAsListItem
      });
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
