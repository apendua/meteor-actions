
var methods = [ 'allow', 'deny', 'onSuccess', 'onError', ];
var components = {};

var toSelector = function (selector) {
  if (_.isString(selector))
    return { action: selector };
  return selector;
};

var uniqueKey = function () {
  if (!uniqueKey.counter)
    uniqueKey.counter = 0;
  return ++uniqueKey.counter;
};

var bind = function (what, selector, callback) {
 if (!_.isFunction(callback))
    throw new Error('callback must be a function, not ' + typeof(callback));
  //------------------------------------------------------------------------
  if (typeof selector === 'string')
    selector = {action:selector};
  var key = uniqueKey();
  return Meteor.actions.find(selector).observeChanges({
    'added': function (id) {
      Actions._getAction(id).add(what, key, callback);
    },
    'removed': function (id) {
      Actions._getAction(id).remove(what, key);
    },
  });
};

_.each(methods, function (what) {
  Actions[what] = function () {
    var args = _.toArray(arguments); args.unshift(what);
    return bind.apply(undefined, args);
  };
});

_.extend(Actions, {

  register: function (props, callback) {

    // TODO: create UI component for this action (?)

    if (!_.isFunction(callback))
      throw new Error('callback must be a function, not ' + typeof(callback));

    //TODO: print warning if props is not unique
    var id = Meteor.actions.insert(toSelector(props));
    
    var action = Actions._getAction(id);
    action.callback = callback;

    var component = null;

    var handle = Actions._transform({_id:id});
    _.each(methods, function (what) {
      handle[what] = function (callback) {
        action.add(what, uniqueKey(), callback);
        return this;
      };
    });

    if (Meteor.isClient) {

      component = components[id] = Template.__action__.extend({});

      handle.events  = _.bind(UI.Component.events,  component);
      handle.helpers = _.bind(UI.Component.helpers, component);

      /*
      handle.addClickEvents = function (options) {
        this.events({
          'click a, click button': function (event, action) {
            action.perform();
          },
        });
        return this;
      }
      */
    }

    return handle;
  },

  getUI: function (id) {
    return components[id] || Template.__action__;
  },

  may: function () {
    var args = _.toArray(arguments), action = null;
    var userId = args.shift();
    selector = args[0]; args[0] = userId;
    action = this.findOne(toSelector(selector), {reactive:false});
    return !!action && action.validate.apply(action, args);
  },

  // this seems useless

  perform: function () {
    var args = _.toArray(arguments);
    var selector = args.shift();
    this.find(toSelector(selector), {reactive:false})
      .forEach(function (action) {
        action.perform.apply(action, args);
      });
  },

});
