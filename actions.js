var actions = {};

Meteor.actions = new Meteor.Collection(null, {
  transform: function (data) {
    var action = getAction(data._id);
    return {
      selector : data,
      callback : action.callback,
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
    };// return
  },// transform
});// Collection

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
    var id = Meteor.actions.insert(props);
    getAction(id).callback = callback;
  },

});
