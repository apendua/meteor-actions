var actions = {};

var transform = function (data) {
  var action = getAction(data._id);
  return {
    perform : function () {
      var self = this, args = _.toArray(arguments), result = undefined;
      // parse options
      var opts = args.pop();
      if (_.isFunction(opts)) {
        opts = { onSuccess: opts };
      } else if (
        !_.isObject(opts) || (
          !_.isFunction(opts.onError) && !_.isFunction(opts.onSuccess)
        ) 
      ) { args.push(opts); opts = {}; }
      // perform action in safe environment
      try {
        if (!self.validate.apply(self, arguments))
          throw new Meteor.Error(403, 'Action not allowed');
        var result = self.callback.apply(self, arguments);
        // trigger onSuccess callbacks
        if (_.isFunction(opts.onSuccess)) 
          opts.onSuccess.call(self, result);
        _.each(action.onSuccess, function (callback) {
          callback.call(self, result);
        });
      } catch (err) {
        if (!_.isFunction(opts.onError) && _.isEmpty(action.onError))
          // no handlers, so throw the error again
          throw err;
        else {
          // trigger onError callbacks
          if (_.isFunction(opts.onError)) 
            opts.onError.call(self, result);
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
        return validator.apply(this, args);
      });
      var deny = _.some(action.deny, function (validator) {
        return validator.apply(this, args);
      });
      return allow && !deny; 
    },
    selector : data,
  };//return
};//transform

Meteor.actions = new Meteor.Collection(null, {transform: transform});

var methods = [ 'allow', 'deny', 'onSuccess', 'onError', ];

var Action = function () {
  var self = this;
  _.each(methods, function (name) {
    self[name] = {};
  });
};

var getAction = function (id) {
  var action = actions[id] || (
      actions[id] = new Action
    );
  return action;
};

var counter = 0;
var uniqueKey = function () {
  return ++counter;
};

var bind = function (name, selector, callback) {
 if (!_.isFunction(callback))
    throw new Error('callback must be a function, not ' + typeof(callback));
  //------------------------------------------------------------------------
  if (typeof selector === 'string')
    selector = {action:selector};
  var key = uniqueKey();
  return Meteor.actions.find(selector).observeChanges({
    'added': function (id) {
      getAction(id)[name][key] = callback;
    },
    'removed': function (id) {
      delete getAction(id)[name][key];
    },
  });
};

Actions = {};

_.each(methods, function (name) {
  Actions[name] = function () {
    var args = _.toArray(arguments); args.unshift(name);
    return bind.apply(undefined, args);
  };
});

_.extend(Actions, {

  register: function (props, callback) {
    if (!_.isFunction(callback))
      throw new Error('callback must be a function, not ' + typeof(callback));

    if (typeof selector === 'string')
      props = {action:props};

    //TODO: check if the props is unique (really?)
    _.extend(props, {_id: Meteor.actions.insert(props)});
    
    var action = getAction(props._id);
    var handle = transform(props);

    action.callback = callback;

    _.each(methods, function (name) {
      handle[name] = function (callback) {
        action[name][uniqueKey()] = callback;
      };
    });

    return handle;
  },

});
