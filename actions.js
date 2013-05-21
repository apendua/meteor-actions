// public actions interface
Actions = {
  _events : {},
};

// helper object
var ActionHelper = function () {};

_.extend(ActionHelper.prototype, {
  each: function (what, self, args) {
    _.each(this[what], function (callback) {
      callback.apply(self, args);
    });
  },
  some: function (what, self, args) {
    return _.some(this[what], function (callback) {
      return callback.apply(self, args);
    });
  },
  add: function (what, key, callback) {
    if (this[what] === undefined)
      this[what] = {};
    this[what][key] = callback;
  },
  remove: function (what, key) {
    if (this[what])
      delete this[what][key];
  },
});

// private actions cache
var actions = {};

Actions._getAction = function (id) {
  var action = actions[id] || (
      actions[id] = new ActionHelper()
    );
  return action;
};

var parseOptions = function (args) {
  var callbacks = _.last(args);
  if (_.isFunction(callbacks))
    return { onSuccess: callbacks };
  if (!_.isObject(callbacks))
    return {};
  var options = {};
  if (_.isFunction(callbacks.onSuccess))
    options.onSuccess = callbacks.onSuccess;
  if (_.isFunction(callbacks.onError))
    options.onError = callbacks.onError;
  return options;
};

Actions._transform = function (data) {
  var action = Actions._getAction(data._id);
  //TODO: decide if we should overwrite this properties
  _.defaults(data, action.helpers);
  return _.extend(data, {
    perform : function () {
      var self = this, args = _.toArray(arguments), result;
      var options = parseOptions(args);
      // prepare arguments for validators
      !_.isEmpty(options) && args.pop();
      args.unshift(Meteor.userId());
      try {
        if (!this.validate.apply(this, args))
          throw new Meteor.Error(403, 'Action not allowed');
        result = action.callback.apply(this, args);
        options.onSuccess && options.onSuccess.call(this, result);
        action.each('onSuccess', this, result);
      } catch (err) {
        if (!options.onError && _.isEmpty(action.onError))
          throw err; // no handlers present, so throw the error again
        else {
          options.onError && options.onError.call(this, err);
          action.each('onError', this, err);
        }
      }
      return result;
    },
    validate : function () {
      var args = _.toArray(arguments); args.unshift(Meteor.userId());
      return action.some('allow', this, args)
        && !action.some('deny', this, args);
    },
  });//return
};//transform

// create meteor collection
Meteor.actions = new Meteor.Collection(null, {transform: Actions._transform});

