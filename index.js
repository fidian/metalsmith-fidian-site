const metalsmithSugar = require("metalsmith-sugar");
const path = require("path");
const debug = require("debug")("metalsmith-fidian-site");

function runHook(name) {
    return (settings) => {
        if (typeof settings.config[name] === "function") {
            debug("Running hook: " + name);

            return Promise.resolve()
                .then(() => {
                    settings.config[name](settings.sugar);
                })
                .then(() => {
                    debug("Done running hook: " + name);

                    return settings;
                });
        } else {
            debug("No hook: " + name);

            return Promise.resolve(settings);
        }
    };
}

function req(name) {
    return Promise.resolve()
        .then(() => {
            debug("Trying to require: " + name);
            return require(path.resolve(process.cwd(), name));
        })
        .then(
            (value) => {
                debug("Success");

                return value;
            },
            (err) => {
                debug("Error: " + err.toString());

                throw err;
            }
        );
}

function doMetadata(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("metadataBefore"))
        .then((settings) => {
            return req("default-metadata").then(
                (metadata) => {
                    settings.sugar.use("metalsmith-default-values", [
                        {
                            pattern: "**/*",
                            defaults: metadata
                        }
                    ]);

                    return settings;
                },
                (e) => settings
            );
        })
        .then((settings) => {
            settings.sugar.use("metalsmith-data-loader");
            settings.sugar.use("metalsmith-ancestry");
            settings.sugar.use("metalsmith-relative-links");
            settings.sugar.use("metalsmith-rootpath");

            return settings;
        })
        .then(runHook("metadataAfter"));
}

function doContents(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("contentsBefore"))
        .then((settings) => {
            settings.sugar.use("metalsmith-handlebars-contents", {
                data: ["./pages/data/**/*"],
                decorators: ["./pages/decorators/**/*.js"],
                helpers: ["./pages/helpers/**/*.js"],
                partials: ["./pages/partials/**/*"]
            });
            settings.sugar.use("metalsmith-markdown");
            settings.sugar.use("metalsmith-rename", [[/\.md$/, ".html"]]);
            return settings;
        })
        .then(runHook("contentsAfter"));
}

function doLayouts(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("layoutsBefore"))
        .then((settings) => {
            settings.sugar.use("metalsmith-handlebars-layouts", {
                data: ["./layouts/data/**/*"],
                decorators: ["./layouts/decorators/**/*.js"],
                helpers: ["./layouts/helpers/**/*.js"],
                partials: ["./layouts/partials/**/*"]
            });

            return settings;
        })
        .then(runHook("layoutsAfter"));
}

function doCss(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("cssBefore"))
        .then((settings) => {
            return req("atomizer").then(
                (atomizer) => {
                    settings.sugar.use("metalsmith-atomizer", atomizer);

                    return settings;
                },
                (e) => settings
            );
        })
        .then((settings) => {
            settings.sugar.use("metalsmith-less"); // Leaves behind *.less files
            settings.sugar.use("metalsmith-move-remove", {
                remove: [".*\\.less$"]
            });

            return settings;
        })
        .then(runHook("cssAfter"));
}

function doRedirects(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("redirectsBefore"))
        .then((settings) => {
            return req("redirects").then(
                (redirects) => {
                    settings.sugar.use("metalsmith-redirect", {
                        htmlExtensions: [".htm", ".html"],
                        redirections: redirects
                    });

                    return settings;
                },
                (e) => settings
            );
        })
        .then(runHook("redirectsAfter"));
}

function doServe(settings) {
    if (settings.serve) {
        return Promise.resolve(settings)
            .then(runHook("serveBefore"))
            .then((settings) => {
                settings.sugar.use("metalsmith-serve", {
                    http_error_files: {
                        404: "/404.html"
                    }
                });

                return settings;
            })
            .then(runHook("serveAfter"));
    }

    return Promise.resolve(settings);
}

function doMakeSugar(settings) {
    const sugarConfig = {
        clean: true,
        destination: "./build",
        metadata: {}, // Cloned
        source: "./site"
    };

    if (settings.config.baseDirectory) {
        sugarConfig.directory = settings.config.baseDirectory;
    }

    settings.sugar = metalsmithSugar(sugarConfig);

    return settings;
}

function doBuild(settings) {
    return new Promise((resolve, reject) => {
        settings.sugar.build((err) => {
            if (err) {
                reject(err);
            } else {
                resolve(settings);
            }
        });
    });
}

function doPostProcess(settings) {
    if (settings.config.postProcess) {
        return new Promise((resolve, reject) => {
            settings.config.postProcess((e) => {
                if (e) {
                    reject(e);
                } else {
                    resolve();
                }
            });
        });
    }
}

function build(config, serve) {
    // Clear the require cache so we can reload content
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
    console.log('Build started');
    const startTime = Date.now();

    return Promise.resolve({
        config: config,
        serve: serve
    })
        .then(doMakeSugar)
        .then(runHook("buildBefore"))
        .then(doMetadata)
        .then(doContents)
        .then(doLayouts)
        .then(doCss)
        .then(doRedirects)
        .then(doServe)
        .then(runHook("buildAfter"))
        .then(doBuild)
        .then(doPostProcess)
        .then(() => {
            console.log(`Build complete, ${Date.now() - startTime}ms`);
        });
}

module.exports = {
    run(config, buildComplete) {
        if (!buildComplete) {
            buildComplete = () => {};
        }

        if (process.env.SERVE || config.serve) {
            const livereload = require("livereload");
            const watch = require("glob-watcher");
            const reloadServer = livereload.createServer();

            build(config, true).then(
                () => {
                    console.log(
                        "Server started, initial build complete, watching for changes"
                    );

                    // done is used to debounce the changes
                    watch(
                        config.watch || [
                            "./*.js",
                            "./*.json",
                            "./layouts/**",
                            "./pages/**",
                            "./site/**"
                        ],
                        () =>
                            build(config, false, (err) => {
                                if (err) {
                                    console.error(err);
                                }

                                // Refreshing everything is better because then
                                // hundreds or thousands of messages are not sent to
                                // the client, causing the browser to trigger hundreds
                                // or thousands of reloads and effectively freezing the
                                // browser for several seconds.
                                reloadServer.refresh("");
                                done(err);
                            })
                    );
                },
                (err) => {
                    throw err;
                }
            );
        } else {
            build(config, false, buildComplete);
        }
    }
};
