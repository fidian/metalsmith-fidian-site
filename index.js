const metalsmithSugar = require("metalsmith-sugar");
const path = require("path");
const debug = require("debug")("metalsmith-site");

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
                    settings.sugar.use(
                        require("metalsmith-default-values")([
                            {
                                pattern: "**/*",
                                defaults: metadata
                            }
                        ])
                    );

                    return settings;
                },
                (e) => settings
            );
        })
        .then((settings) => {
            settings.sugar.use(require("metalsmith-data-loader")());
            settings.sugar.use(require("metalsmith-ancestry")());
            settings.sugar.use(require("metalsmith-relative-links")());
            settings.sugar.use(require("metalsmith-rootpath")());

            return settings;
        })
        .then(runHook("metadataAfter"));
}

function doContents(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("contentsBefore"))
        .then((settings) => {
            settings.sugar.use(
                require("metalsmith-handlebars-contents")({
                    data: ["./handlebars/pages/data/**/*"],
                    decorators: ["./handlebars/pages/decorators/**/*.js"],
                    helpers: ["./handlebars/pages/helpers/**/*.js"],
                    partials: ["./handlebars/pages/partials/**/*"]
                })
            );
            settings.sugar.use(require("metalsmith-markdown")());
            settings.sugar.use(
                require("metalsmith-rename")([[/\.md$/, ".html"]])
            );
            return settings;
        })
        .then(runHook("contentsAfter"));
}

function doLayouts(settingsInitial) {
    return Promise.resolve(settingsInitial)
        .then(runHook("layoutsBefore"))
        .then((settings) => {
            settings.sugar.use(
                require("metalsmith-handlebars-layouts")({
                    data: ["./handlebars/layouts/data/**/*"],
                    decorators: ["./handlebars/layouts/decorators/**/*.js"],
                    helpers: ["./handlebars/layouts/helpers/**/*.js"],
                    layouts: "./handlebars/layouts/",
                    partials: ["./handlebars/layouts/partials/**/*"]
                })
            );

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
                    settings.sugar.use(
                        require("metalsmith-atomizer")(atomizer)
                    );

                    return settings;
                },
                (e) => settings
            );
        })
        .then((settings) => {
            settings.sugar.use(
                require("@fidian/metalsmith-less")({ removeSource: true })
            );

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
                    settings.sugar.use(
                        require("@fidian/metalsmith-redirect")({
                            htmlExtensions: [".htm", ".html"],
                            redirections: redirects
                        })
                    );

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
                settings.sugar.use(
                    require("@fidian/metalsmith-serve")({
                        http_error_files: {
                            404: "/404.html"
                        }
                    })
                );

                return settings;
            })
            .then(runHook("serveAfter"));
    }

    return Promise.resolve(settings);
}

function doMakeSugar(settings) {
    const sugarConfig = {
        clean: settings.clean,
        destination: settings.config.destination || "./build",
        metadata: {}, // Cloned
        source: settings.config.source || "./site"
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

function build(config, serve, clean) {
    // Clear the require cache so we can reload content
    Object.keys(require.cache).forEach((key) => delete require.cache[key]);
    console.log("Build started");
    const startTime = Date.now();

    return Promise.resolve({
        clean: clean,
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

            build(config, true, true).then(
                () => {
                    console.log(
                        "Server started, initial build complete, watching for changes"
                    );

                    // done is used to debounce the changes
                    watch(
                        config.watch || [
                            "./*.js",
                            "./*.json",
                            "./handlebars/**",
                            "./site/**"
                        ],
                        (done) =>
                            build(config, false, false).then(
                                () => {
                                    // Refreshing everything is better because then
                                    // hundreds or thousands of messages are not sent to
                                    // the client, causing the browser to trigger hundreds
                                    // or thousands of reloads and effectively freezing the
                                    // browser for several seconds.
                                    reloadServer.refresh("");
                                    done(err);
                                },
                                (err) => {
                                    console.error(err);
                                    done(err);
                                }
                            )
                    );
                },
                (err) => {
                    throw err;
                }
            );
        } else {
            build(config, false, true).then(buildComplete, buildComplete);
        }
    }
};
