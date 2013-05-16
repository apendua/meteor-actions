# meteor-actions

This package provides a level of abstraction for simple
action management. It allows you to specify privilages
for each action separately, or for a group of actions.
You can do things like searching for all actions with
given properties, or embedding actions into your
templates with a bunch of helpers provided by the package.

## Installation

Supposing you're developing your app with
[meteorite](https://github.com/oortcloud/meteorite)
the only thing you need to do is
```
mrt add actions
```

## Privileges API

An action is a callback with properties attached.

### Actions.register

```javascript
Actions.register = function (props, callback) { ... }
```
Lets start by defining a new action:
```javascript
Actions.register({
  target: 'user',
  action: 'remove',
  // ...
}, function (userToRemove) {
  // remove the given user ...
});
```
The return value is an action handler, that will
allow you to configure your action.
Note, that the first argument can be an arbitrary
object that can be serialized. Registering an action
will put it into a global `Meteor.actions` collection,
so you can allways access it like this:
```javascript
removeAction = Meteor.actions.findOne({action:'remove', target:'user'});
```
We can now perform `removeUser` action by calling:
```javascript
removeAction.perform(userToRemove);
```
If you tried this yourself, you would probabbly
notice that the above routine throws an exception telling that the action
is not allowed. This is because no one is allowed to remove any users so far.

The simplest way to change this is the following:
```javascript
removeAction.allow(function (userId, userToRemove) {
  if (userId === userToRemove)
    return true;
});
```
Now each user can remove herself. The action validator
will get current `userId` (action performer) as well as
all the arguments of the `perform` routine.

### Actions.allow/deny

```javascript
Actions.allow/deny = function (selector, validator) { ... };
```

But what if we want the admin to remove a user.
Of course, we can write another `allow` rule.
However, this solution is clearly not the best possible.
Imagine, that in a moment we will have another action, e.g.
`changeUserPrivilages`, which should also be accessible
by the admin. Since we're lazy, we don't want to write
a new rule for each action. But, we can do the following
```javascript
Actions.allow({target:user}, function (userId) {
  // suppose that admins is some object
  return userId in admins;
});
```
This will make every action with property `target=='user'`
will be accessible to the admin. If we were even more witty,
we could allow the admin to perform every single
action registered in the system:
```javascript
Actions.allow({}, function (userId) {
  return userId in admins;
});
```
If at some point you will decide, that there is an action
that should be denied to the admin
(e.g. something connected with user's privacy)
you can allways fix this by creating a `deny` rule:
```javascript
Actions.deny({secret:true}, function (userId, secretOwner) {
  if (userId === secretOwner)
    return false;
  return true;
});
```

### Actions.onSuccess/onError

```javascript
Actions.onSuccess = function (selector, callback) { ... };
```
This callback will be triggered after each successful
action execution. For example:
```javascript
// by explicitly using action handler ...
removeAction.onSuccess(function (userToRemove) {
  console.log('user', userToRemove, 'was removed');
});
// ... or by using action selector
Actions.onSuccess({target:user}, function () {
  console.log('someone performed an action on user');
});
```
The single argument passed to the callback is the value
returned by the action routine. If the action throws an error,
the `onError` callbacks will be triggered instead of `onSuccess`,
with the error object passed as the first argument.

You can also specify `onError` and `onSuccess` callbacks
for a specific action call like this:
```javascript
removeUser.perform(..., {
  onSuccess : function () { ... },
  onError   : function () { ... },
});
```
If a single function is passed, it is assumed to be the `onSuccess`
callback.

## Templates API

You can also attach events to actions just
as you would do with a template:
```javascript
removeUser.events({
  'click button': function (event, action) {
    action.perform(this._id);
  },
});
```
This will allow you to do something like:
```html
{{#with user}}
  {{#action action='remove' target='user'}}
    <button type="button">Remove user {{user.username}}</button>
  {{/action}}
{{/with}}
```
or, if you prefer shorter code:
```html
{{#with user}}
  {{actionButton action='remove' target='user'}}
{{/with}}
```
In the second case you'll also need to define a label for the action:
```javascript
removeUser.label = function (context) {
  if (this.validate(context._id))
    return 'Remove user ' + context.username;
  return 'Action not allowed';
};
```
As you can see, `this` represents the corresponding action here,
so you can use it to customize your label depending on action
parameters/privilages.

Using `{{action}}` helper will additionally ensure that
the buttons corresponding to not allowed actions
will be put in a disabled state or even hidden. To achieve
this, you'll need to do the following:
```javascript
// disable button if the action des not validate
removeUser.disable = function (context) {
  if (!this.validate(context._id))
    return true;
};
// ... or if you want to be even more cautious
removeUser.hide = function (context) {
  // ...
};
```



