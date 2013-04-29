
Package.describe({
    summary: "A toolset for action buttons creation",
});

Package.on_use(function (api) {
    //TODO: remove underscore dependency?
    api.use(['spark', 'underscore'], 'client');

    // JS code
    api.add_files('actions.js', 'client');
    api.add_files('helpers.js', 'client');
});
