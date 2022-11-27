/* Very simplistic layout processor.
 *
 * When "layouts" is in a file's metadata, this will look for
 * layouts/VALUE-before.html and layouts/VALUE-after.html and will add the
 * content to the file. If either file is missing, this will report errors.
 *
 * Default options:
 *
 * {
 *     property: "layout",
 *     layoutsDir: "layouts/",
 *     beforeSuffix: "-before.html",
 *     afterSuffix: "-after.html"
 *     match: "**"+"/*.md"  // Sorry, breaking this up to preserve the comment
 * }
 */

const pluginName = "metalsmith-site/plugins/simple-layouts";
const debug = require("debug")(pluginName);
const metalsmithPluginKit = require("metalsmith-plugin-kit");
const fsPromises = require("fs").promises;

/**
 * @typedef Options
 * @property {string} property Name of the property to look for in the file
 *     object's metadata.
 * @property {string} layoutsDir Directory where layout files are stored.
 * @property {string} beforeSuffix What to add to a layout for finding the file.
 * @property {string} afterSuffix What to add to a layout for finding the file.
 * @property {string} match Files to match
 **/

/**
 * Metalsmith plugin to perform very simple layout wrapping.
 *
 * @param {Options} [options]
 * @return {import('metalsmith').Plugin}
 */
const plugin = function (options) {
    options = metalsmithPluginKit.defaultOptions({
        property: "layout",
        layoutsDir: "layouts/",
        beforeSuffix: "-before.html",
        afterSuffix: "-after.html",
        match: "**/*.md"
    });

    const layoutPromises = {};

    function readFile(layout, suffix) {
        return fsPromises
            .readFile(`${options.layoutsDir}${layout}${suffix}`)
            .then((content) => content.toString());
    }

    function getLayoutPromise(layout) {
        if (!layoutPromises[layout]) {
            layoutPromises[layout] = Promise.all([
                readFile(layout, options.beforeSuffix),
                readFile(layout, options.afterSuffix)
            ]);
        }

        return layoutPromises[layout];
    }

    return metalsmithPluginKit.middleware({
        each: (file, data, files) => {
            if (!data.layout) {
                return Promise.resolve();
            }

            return getLayoutPromise(data.layout).then(([beforeStr, afterStr]) => {
                debug("Wrapping file: %s [%s]", file, data.layout);
                data.contents = Buffer.from(
                    beforeStr + data.contents.toString() + afterStr
                );
            });
        },
        match: options.match,
        name: pluginName
    });
};

module.exports = plugin;
