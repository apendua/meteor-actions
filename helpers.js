
var blacklist = ['showDenied', ];

var getActionSelector = function (node, options) {
  var options = _.omit(options, blacklist);
  var dataset = $(node).data(); // or use node.dataset
  options.action = "";
  var selector = {};
  _.each(options, function (value, key) {
    selector[key] = dataset[key] || value;
  });
  return selector;
};

Handlebars.registerHelper('actions', function (context, options) {
  if (options === undefined) { options = context; context = this; }
  var handle;
  //Q: do we really want UNIQUE_LABEL (?)
  var html = Spark.labelBranch(Spark.UNIQUE_LABEL, function () {
    var html = Spark.createLandmark({
      rendered: function () {
        //TODO: how we should disable links?
        var nodes = this.findAll('[data-action]');
        handle = Deps.autorun(function () {
          _.each(nodes, function (node) {
            var action = Meteor.actions.findOne(getActionSelector(node, options.hash));
            if (action && action.validate(Spark.getDataContext(node))) {
              $(node).removeClass('disabled').prop('disabled', false)
                .filter('a').parent().filter('li').removeClass('disabled');
            } else {
              $(node).addClass('disabled').prop('disabled', true)
                .filter('a').parent().filter('li').addClass('disabled');
            }
          });// each
        });// autorun
      },
      destroyed: function () {
        if (handle)
          handle.stop();
      },
    }, function () { // landmark
      var html = Spark.isolate(function () {
        if (options && _.isFunction(options.fn))
          return options.fn(context);
        return '';
      }); // isolate
      html = Spark.attachEvents({
        'click [data-action]': function (event) { // event, landmark
          var action = Meteor.actions.findOne(getActionSelector(
            $(event.target).closest('[data-action]'), options.hash
          ));
          if (action && action.validate(this)) {
            action.callback.call(this, event, action); //XXX: using action instead of template
            event.preventDefault();
          }
        },
      }, html); // attachEvents
      return html;
    }); // createLandmark
    html = Spark.setDataContext(context, html);
    return html;
  }); // labelBranch
  return html;
});

