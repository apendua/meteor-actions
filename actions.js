var actions = {};

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

var transform = function (data) {
  var action = getAction(data._id);
  return _.extend(data, {
    perform : function () {
      var self = this, args = _.toArray(arguments), result;
      var options = parseOptions(args);
      // prepare arguments for validators
      !_.isEmpty(options) && args.pop();
      args.unshift(Meteor.userId());
      try {
        if (!self.validate.apply(self, args))
          throw new Meteor.Error(403, 'Action not allowed');
        result = self.callback.apply(self, args);
        options.onSuccess && options.onSuccess.call(self, result);
        _.each(action.onSuccess, function (callback) {callback.call(self, result)});
      } catch (err) {
        if (!options.onError && _.isEmpty(action.onError))
          throw err; // no handlers present, so throw the error again
        else {
          options.onError && options.onError.call(self, err);
          _.each(action.onError, function (callback) {callback.call(self, err)});
        }
      }
      return result;
    },
    callback : function () {
      return action.callback.call(this, arguments);
    },
    validate : function () {
      var args = arguments;
      var allow = _.some(action.allow, function (validator) {
        return validator.apply(this, args);
      });
      var deny = _.some(action.deny, function (validator) {
        return validator.apply(this, args);
      });
      return allow && !deny; 
    },
  });//return
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

var uniqueKey = function () {
  if (!uniqueKey.counter)
    uniqueKey.counter = 0;
  return ++uniqueKey.counter;
};

var toSelector = function (selector) {
  if (_.isString(selector))
    return { action: selector };
  return selector;
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

    //TODO: print warning if props is not unique
    var id = Meteor.actions.insert(toSelector(props));
    
    var action = getAction(id);
    action.callback = callback;

    var handle = transform({_id:id});
    _.each(methods, function (name) {
      handle[name] = function (callback) {
        action[name][uniqueKey()] = callback;
      };
    });
    /*
    handle.events = function (eventMap) {
      var events = Actions._events[props._id] ||
                  (Actions._events[props._id] = {});
      //--------------------------------------------
      _.each(eventMap, function (callback, spec) {
        events[spec] = (events[spec] || []);
        events[props._id][spec].push(function (event) {
          return callback.call(this, event, handle);
        });
      });
    };
    */
    return handle;
  },

  find: function () {
    return Meteor.actions.find.apply(Meteor.actions, arguments);
  },

  findOne: function () {
    return Meteor.actions.findOne.apply(Meteor.actions, arguments);
  },

  filter: function (selector) {
    var proxy = {}, self = this, omit = ['may', 'perform', ];
    selector = EJSON.clone(selector); // for safety :P
    _.each(self, function (value, key) {
      if (omit.indexOf(key) < 0 && _.isFunction(value)) {
        proxy[key] = function () {
          var args = _.toArray(arguments);
          // do not break the original selector
          args[0] = _.defaults(_.clone(selector), args[0]);
          return value.apply(self, args); // XXX is self ok?
        };//proxy
      } else
        proxy[key] = value;
    });//each
    return proxy;
  },

  may: function () {
    var args = _.toArray(arguments), action = null;
    var userId = args.shift();
    selector = args[0]; args[0] = userId;
    action = this.findOne(toSelector(selector), {reactive:false});
    return !!action && action.validate.apply(action, args);
  },

  perform: function () {
    var args = _.toArray(arguments);
    var selector = args.shift();
    this.find(toSelector(selector), {reactive:false})
      .forEach(function (action) {
        action.perform.apply(action, args);
      });
  },

});
