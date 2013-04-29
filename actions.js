var actions = {};

Meteor.actions = new Meteor.Collection(null, {
  transform: function (data) {
    var action = getAction(data._id);
    return {
      selector : data,
      callback : action.callback,
      validate : function validate (context) {
        //TODO: also use deny rules
        //TODO: use generic arguments
        var pass = _.some(action.allow, function (validator) {
          return validator.call(action, Meteor.userId(), context);
        });
        return pass; 
      },
    };// return
  },// transform
});// Collection

var getAction = function (id) {
  var action = actions[id] || (
    actions[id] = {
      allow : [],
      deny  : [],
    });
  return action;
};

// TEMPLATE ACTIONS

Actions = {};

define('actions', [], function () {

  _.extend(Actions, {

    register: function (selector, callback) {
      if (!_.isFunction(callback))
        throw new Error('callback must be a function, not ' + typeof(callback));

      if (typeof selector === 'string')
        selector = {action:selector};

      //TODO: check if the selector is unique
      var id = Meteor.actions.insert(selector);
      getAction(id).callback = callback;
    },

    //TODO: implement allow deny with common code
    allow: function (selector, validator) {
      if (!_.isFunction(validator))
        return;

      if (typeof selector === 'string')
        selector = {action:selector};

      Meteor.actions.find(selector).observeChanges({
        'added': function (id) {
          getAction(id).allow.push(validator);
        },
        'removed': function (id) {
          // remove validator from list
        },
      });
    },

    deny: function (selector, validator) {
      if (!_.isFunction(validator))
        return;

      if (typeof selector === 'string')
        selector = {action:selector};

      Meteor.actions.find(selector).observeChanges({
        'added': function (id) {
          getAction(id).deny.push(validator);
        },
        'removed': function (id) {
          // remove validator from list
        },
      });
    },
  });

  return Actions;
});

