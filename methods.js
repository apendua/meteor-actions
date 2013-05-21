
var methods = [ 'allow', 'deny', 'onSuccess', 'onError', ];

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
    if (!_.isFunction(callback))
      throw new Error('callback must be a function, not ' + typeof(callback));

    //TODO: print warning if props is not unique
    var id = Meteor.actions.insert(toSelector(props));
    
    var action = Actions._getAction(id);
    action.callback = callback;

    var handle = Actions._transform({_id:id});
    _.each(methods, function (what) {
      handle[what] = function (callback) {
        action.add(what, uniqueKey(), callback);
      };
    });

    if (Meteor.isClient) {

      handle.events = function (eventMap) {
        var events = Actions._events[id] || (Actions._events[id] = {});
        _.each(eventMap, function (callback, spec) {
          events[spec] = (events[spec] || []);
          events[spec].push(function (event) {
            return callback.call(this, event, handle);
          });
        });
      };

      handle.helpers = function (options) {
        var helpers = action.helpers || (action.helpers = {});
        _.each(options, function (callback, name) {
          helpers[name] = callback;
        });
      };
    }

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
