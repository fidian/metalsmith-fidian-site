@fidian/metalsmith-site
=======================

When trying to get started with a simple [Metalsmith] site, I want a certain setup to exist.

* Default metadata is inserted into each file object.
* File metadata has links to other files so I can build file trees, navigate into any direction, quickly link all children.
* A link function is added allowing automatic HTML link creation between two file objects.
* Atomizer (Atomic CSS) processes all files to build the necessary CSS.
* Redirections from old paths that people bookmarked are made.
* File contents are processed with Markdown, wrapped in a simple layout, then processed with Handlebars.
* Built-in web server and live reloading of all files, data files, and Handlebars files.
* Ability to hook into the build process to add my own site-specific plugins and configurations.

This package does that for you.


Installation
------------

Want the quick way to get going? Look at [metalsmith-site-example](https://github.com/fidian/metalsmith-site-example).

Prefer to do this step by step? Cool with me. First, install the package.

```bash
npm install --save @fidian/metalsmith-site
```

Add some helpful scripts to your `package.json`.

```json
{
    ...
    "scripts": {
        "build": "node metalsmith.js",
        "start": "SERVE=true node metalsmith.js"
    }
    ...
}
```

Finally, create this boilerplate `metalsmith.js`.

```js
const metalsmithSite = require('@fidian/metalsmith-site');
metalsmithSite.run({
    baseDirectory: __dirname
    // Additional config goes here
}, err => {
    if (err) {
        console.error(err);
    }
});
```

There are several configuration options listed below so you can configure how the plugins work and add your own functionality at key moments during the build.


Upgrade Notes
-------------

### Version 2

* Removed `metalsmith-atomizer` from the build. It is slower and less effective than [@fidian/acss-live](https://github.com/fidian/acss-live/'), and about the same size to the client.

* Removed `layoutBefore` and `layoutAfter` hooks. (version 2.0.0 through 2.0.2 only, restored in 2.1.0)

* Removed `metalsmith-handlebars-layouts' and replaced with a very simplistic layouts. Because of this, `handlebars/layouts/` is removed and `handlebars/pages/` now becomes `handlebars/`.

* Attempted to addressed problems with concurrent builds.


Project Structure
-----------------

For this to work, here is how the repository should be laid out.

* `atomizer.[js,json]` - Atomizer configuration object. Without this file, atomizer won't run. The contents of this file are passed directly to [`metalsmith-atomizer`](https://www.npmjs.com/package/metalsmith-atomizer), allowing you to change the defaults easily.
* `build/` - Where files will be written. This file is created if it does not exist.
* `default-metadata.[js,json]` - Results in an object used for each file's default metadata.
* `handlebars/` - Stores the partials and helpers used for both the page generation and the layout wrapping.
    * `data/` - Data files to load.
    * `decorators/` - Handlebars decorators.
    * `helpers/` - Functions to add.
    * `partials/` - HTML templates.
* `layouts/` - Wrappers for simple layouts.
* `metalsmith.js` - The file from above.
* `node_modules/`
* `package.json`
* `redirects.[js,json]` - Write redirect files to your project. This file generates an object whose keys are the filenames to create and the values are where to redirect. Redirections can be relative to the file or root-relative.
* `site/` - Your source files for the site.


Configuration
-------------

These are all properties that control normal settings.

* `baseDirectory` (string, since 1.0.0)
    The folder to use as the base. Typically uses `metalsmith-sugar` and it uses `../../..`, which should resolve to your project's root. If that's not working, you could simply set this to `__dirname`, as is done in the example.
    Default: `../../..` from the folder of `metalsmith-sugar`.
* `destination` (since 1.2.0)
    Where generated files are placed.
    Default: `./build`
* `serve` (boolean, since 1.0.0)
    When enabled, the site is served on port 8080 (default). This setting can also be enabled by setting the `SERVE` environment variable to any non-empty string.
    Default: `false`
* `source` (since 1.2.0)
    The files that are loaded into the build system.
    Default: `./site`
* `watch` (array of strings that specify file globs, since 1.0.0)
    Watches files and folders for changes when the server is enabled. When any changes are detected, a full site rebuild is performed.
    Default: `['*.js', '*.json', 'handlebars/**', 'site/**']`

There's also the following properties that are hook functions. They are executed before and after each step, in the following order. Note that the `serve` step (and thus `serveBefore` and `serveAfter`) may not be executed if not serving. All of these hook functions are expected to take a single argument, the instance of `metalsmith-sugar` in order to add additional plugins. The function can optionally return a `Promise` in case the plugin can't be added synchronously.

* `buildBefore` (hook function, since 1.0.0)
* `metadataBefore` (hook function, since 1.0.0)
* `metadataAfter` (hook function, since 1.0.0)
* `contentsBefore` (hook function, since 1.0.0)
* `contentsAfter` (hook function, since 1.0.0)
* `layoutsBefore` (hook function, since 1.0.0, removed in 2.0.x, added in 2.1.0)
* `layoutsAfter` (hook function, since 1.0.0, removed in 2.0.x, added in 2.1.0)
* `cssBefore` (hook function, since 1.0.0)
* `cssAfter` (hook function, since 1.0.0)
* `redirectsBefore` (hook function, since 1.0.0)
* `redirectsAfter` (hook function, since 1.0.0)
* `serveBefore` (hook function, since 1.0.0)
* `serveAfter` (hook function, since 1.0.0)
* `buildAfter` (hook function, since 1.0.0)

Also, there's a special hook that takes a single `done` callback. Your code can read files, perform additional processing, or fulfill any needs in order to complete the build. When you're ready and the file modifications are complete, call `done()`. At this point, there is no Metalsmith instance and the files will have been written to `build/`.

* `postProcess` (callback function, since 1.0.0)
    How to add a bit of processing after each build. Details below.


API
---

* `.run(config, [buildComplete])`
    Starts a build of Metalsmith or starts the server. The `buildComplete` function is called whenever any build is finished, including the live reload builds.


Recipes
-------


### Modifying metadata

If you want to have dynamic metadata, such as adding a build date, you can accomplish in two ways. One would be to use `default-metadata.js`.

```
module.exports = {
    buildDate: new Date()
};
```

Another way would be to leverage the `metadataAfter` hook.

```
const metalsmithSite = require('@fidian/metalsmith-site');
metalsmithSite.run({
    baseDirectory: __dirname
    metadataAfter: (sugar) => {
        sugar.use((files, metalsmith, done) => {
            // Access the metadata object with metalsmith._metadata
            metalsmith._metadata.buildDate = new Date();
            done();
        });
    }
}, err => {
    if (err) {
        console.error(err);
    }
});
```


### Setting the default layout for all pages

Pages can each specify a layout, which will override the global layout property.

Edit `default-metadata.json`:

```
{
    "layout": "default-layout"
}
```

This will wrap all pages in a layout using `layouts/default-layout-before.html` and `layouts/default-layout-after.html`. If you want to change one page's layout, you can do that by editing the file's metadata.

```
---
title: Sample page that changes the layout
layout: changed-layout
---

Your Markdown goes here for a page. It will be inserted between the layout files `layouts/changed-layout-before.html` and `layouts/changed-layout-after.html`.
```

Here's two sample layout files to help illustrate the point.

```
<!DOCTYPE html>
<html><head><title>{{title}}</title></head>
<body>
```

That was the `*-before.html` sample and this will be `*-after.html`.

```
</body>
</html>
```

Handlebars is allowed in these files, but markdown is not.


Debugging
---------

This uses `debug`, so use the `DEBUG` environment variable when running a build to see lots of output. Most of the other plugins do the same. You can see all output by using `DEBUG='*' npm run build` or simply this library's output with `DEBUG=metalsmith-site npm run build`.


[Metalsmith]: https://metalsmith.io
