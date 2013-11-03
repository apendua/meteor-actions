
Package.describe({
    summary: "Basic action management API",
});

Package.on_use(function (api) {
    api.use(['spark', 'templating', 'handlebars'], 'client');
    api.use(['underscore', 'ejson'], ['client', 'server']);

    api.add_files('actions.js', ['client', 'server']);
    api.add_files('methods.js', ['client', 'server']);
    
    api.add_files('helpers.html', 'client');
    api.add_files('helpers.js', 'client');

    if (api.export)
        api.export('Actions');
});
