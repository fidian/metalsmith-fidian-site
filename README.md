metalsmith-fidian-site
======================

When trying to get started with a simple [Metalsmith] site, I want a certain setup to exist.

* Default metadata is inserted into each file object.
* File metadata has links to other files so I can build file trees, navigate into any direction, quickly link all children.
* A link function is added allowing automatic HTML link creation between two file objects.
* Atomizer (Atomic CSS) processes all files to build the necessary CSS.
* Redirections from old paths that people bookmarked are made.
* File contents are processed with Handlebars, then processed with Markdown, and then finally wrapped in a layout that is also using Handlebars.
* Built-in web server and live reloading of all files, data files, and Handlebars files.
* Ability to hook into the build process to add my own site-specific plugins and configurations.

This package does that for you.


Installation
------------

First, install the package.

```bash
npm install --save metalsmith-fidian-site
```

Add some helpful scripts to your `package.json`.

```json
{
    ...
    "scripts": {
        "build": "node metalsmith.js",
        "start": "SERVE=true metalsmith-fidian-site"
    }
    ...
}
```

Finally, create this boilerplate `metalsmith.js`.

```js
const metalsmithFidianSite = require('metalsmith-fidian-site');
metalsmithFidianSite.run({
    baseDirectory: __dirname
    // Additional config goes here
});
```

There are several configuration options listed below so you can configure how the plugins work and add your own functionality at key moments during the build.


Project Structure
-----------------

For this to work, here is how the repository should be laid out.

* `atomizer.[js,json]` - Atomizer configuration object. Without this file, atomizer won't run.
* `build/` - Where files will be written. This file is created if it does not exist.
* `default-metadata.[js,json]` - Results in an object used for each file's default metadata.
* `metalsmith.js` - The file from above.
* `node_modules/`
* `package.json`
* `redirects.[js.json]` - Write redirect files to your project. This file generates an object whose keys are the filenames to create and the values are where to redirect. Redirections can be relative to the file or root-relative.
* `site/` - Your source files for the site.


Configuration
-------------

Hook functions execute before and after each step. First, `buildBefore` is called, then the hooks for `metadata`, `contents`, `layouts`, `css`, `redirects`, `serve` (may not be called if not serving files), and finally the `buildAfter` hook.

* `baseDirectory` (string, since 1.0.0)
    The folder to use as the base. Typically uses `metalsmith-sugar` and it uses `../../..`, which should resolve to your project's root. If that's not working, you could simply set this to `__dirname`, as is done in the example.
    Default: `../../..` from the folder of `metalsmith-sugar`.
* `buildAfter` (hook function, since 1.0.0)
* `buildBefore` (hook function, since 1.0.0)
* `contentsAfter` (hook function, since 1.0.0)
* `contentsBefore` (hook function, since 1.0.0)
* `cssAfter` (hook function, since 1.0.0)
* `cssBefore` (hook function, since 1.0.0)
* `layoutsAfter` (hook function, since 1.0.0)
* `layoutsBefore` (hook function, since 1.0.0)
* `metadataAfter` (hook function, since 1.0.0)
* `metadataBefore` (hook function, since 1.0.0)
* `postProcess` (callback function, since 1.0.0)
    How to add a bit of processing after each build. Details below.
* `redirectsAfter` (hook function, since 1.0.0)
* `redirectsBefore` (hook function, since 1.0.0)
* `serve` (boolean, since 1.0.0)
    When enabled, the site is served on port 8080 (default). This setting can also be enabled by setting the `SERVE` environment variable to any non-empty string.
    Default: `false`
* `serveAfter` (hook function, since 1.0.0)
* `serveBefore` (hook function, since 1.0.0)
* `watch` (array of strings that specify file globs, since 1.0.0)
    Watches files and folders for changes when the server is enabled. When any changes are detected, a full site rebuild is performed.
    Default: `['*.js', '*.json', 'layouts/**', 'pages/**', 'site/**']`

The optional `postProcess` function takes a single `done` callback. Your code can read files, perform additional processing, or fulfill any needs in order to complete the build. When you're ready and the file modifications are complete, call `done()`. At this point, there is no Metalsmith instance and the files will have been written to `build/`.

All of the hook functions are expected to take a single argument, the instance of `metalsmith-sugar` in order to add additional plugins. The function can optionally return a `Promise` in case the plugin can't be added synchronously.


API
---

* `.run(config, [buildComplete])`
    Starts a build of Metalsmith or starts the server. The `buildComplete` function is called whenever any build is finished, including the live reload builds.


Debugging
---------

This uses `debug`, so use the `DEBUG` environment variable when running a build to see lots of output. Most of the other plugins do the same. You can see all output by using `DEBUG='*' npm run build` or simply this library's output with `DEBUG=metalsmith-fidian-site npm run build`.


[Metalsmith]: https://metalsmith.io
