var actions = {};

var transform = function (data) {
  var action = getAction(data._id);
  return {
    perform : function () {
      var self = this, result;
      try {
        if (!self.validate.apply(self, arguments))
          throw new Meteor.Error(403, 'Action not allowed');
        var result = self.callback.apply(self, arguments);
        _.each(action.onSuccess, function (callback) {
          callback.call(self, result);
        });
      } catch (err) {
        if (_.isEmpty(action.onError))
          throw err;
        else {
          _.each(action.onError, function (callback) {
            callback.call(self, err);
          });
        } //if (_.isEmpty(...))
      } //catch
      return result;
    },
    callback : function () {
      return action.callback.call(this, arguments);
    },
    validate : function () {
      var args = _.toArray(arguments); args.unshift(Meteor.userId());
      //-------------------------------------------------------------
      var allow = _.some(action.allow, function (validator) {
        return validator.apply(action, args);
      });
      var deny = _.some(action.deny, function (validator) {
        return validator.apply(action, args);
      });
      return allow && !deny; 
    },
    selector : data,
  };//return
};//transform

Meteor.actions = new Meteor.Collection(null, {transform: transform});

var getAction = function (id) {
  var action = actions[id] || (
    actions[id] = {
      onSuccess : {},
      onError   : {},
      allow     : {},
      deny      : {},
    });
  return action;
};

var counter = 0;
var uniqueKey = function () {
  return ++counter;
};

var bind = function (type, selector, callback) {
 if (!_.isFunction(callback))
    throw new Error('callback must be a function, not ' + typeof(callback));
  //------------------------------------------------------------------------
  if (typeof selector === 'string')
    selector = {action:selector};
  var key = uniqueKey();
  return Meteor.actions.find(selector).observeChanges({
    'added': function (id) {
      getAction(id)[type][key] = callback;
    },
    'removed': function (id) {
      delete getAction(id)[type][key];
    },
  });
};

// TEMPLATE ACTIONS

Actions = {};

_.each([ 'allow', 'deny', 'onSuccess', 'onError', ], function (type) {
  Actions[type] = function () {
    var args = _.toArray(arguments); args.unshift(type);
    return bind.apply(undefined, args);
  };
});

_.extend(Actions, {

  register: function (props, callback) {
    if (!_.isFunction(callback))
      throw new Error('callback must be a function, not ' + typeof(callback));

    if (typeof selector === 'string')
      props = {action:props};

    //TODO: check if the props is unique
    _.extend(props, {_id: Meteor.actions.insert(props)});
    getAction(props._id).callback = callback;
    return transform(props);
  },

});
