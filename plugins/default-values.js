/* A copy of @metalsmith/default-values as of 2024-02-09.
 *
 * The published version of this package uses lodash, which is flagged with a security vulnerability. The unpublished version does not, but it is not available on npm.
 *
 * This will be removed once @metalsmith/default-values is published with the new code.
 */

const { Buffer } = require("buffer");
const get = require("dlv");
const { dset: set } = require("dset");

/**
 * Sets defaults for object values
 * @param {Array<Array<*>>} defaults
 * @param {'keep'|'overwrite'} strategy
 * @return {import('.').DefaultSetter} Takes an object and sets defaults
 */
function set_defaults(defaults, strategy) {
    return (item, context) => {
        defaults.forEach(([key, defaultValue]) => {
            const value = get(item, key);
            if (
                strategy === "overwrite" ||
                value === void 0 ||
                value === null ||
                (Buffer.isBuffer(value) && value.toString().trim().length === 0)
            ) {
                if (typeof defaultValue === "function")
                    defaultValue = defaultValue(item, context);
                if (Buffer.isBuffer(value) && !Buffer.isBuffer(defaultValue))
                    defaultValue = Buffer.from(defaultValue);
                set(item, key, defaultValue);
            }
        });
        return item;
    };
}

/**
 * @callback DefaultSetter
 * @param {import('metalsmith').File} file
 * @param {Object<string, *>} metadata
 */

/**
 * @typedef {Object} DefaultsSet
 * @property {string|string[]} [pattern="**"] 1 or more glob patterns to match files. Defaults to `'**'` (all).
 * @property {Object<string, *>} [defaults={}] an object whose keys will be set as file metadata keys
 * @property {'keep'|'overwrite'} [strategy="keep"] Strategy to handle setting defaults to keys that are aleady defined. Defaults to `'keep'`
 */

/** @type {DefaultsSet} */
const defaultDefaultsSet = {
    defaults: {},
    strategy: "keep",
    pattern: "**"
};

/**
 * Set `defaults` to file metadata matching `pattern`'s.
 *
 * @param  {DefaultsSet|DefaultsSet[]} options an array of defaults sets to add to files matched by pattern
 * @return {import('metalsmith').Plugin}
 *
 * @example
 * metalsmith.use(defaultValues({
    pattern: 'posts/*.md',
    defaults: {
      layout: 'post.hbs',
      draft: false,
      date(post) {
        return post.stats.ctime
      }
    }
  }))
 **/

function defaultValues(options) {
    return function defaultValues(files, metalsmith, done) {
        const debug = metalsmith.debug("@metalsmith/default-values");
        debug("Running with options: %O ", options);
        if (
            !Array.isArray(options) &&
            typeof options === "object" &&
            options !== null
        ) {
            options = [options];
        }
        const defaultSets = (options || []).map((defaultsSet) =>
            Object.assign({}, defaultDefaultsSet, defaultsSet)
        );

        // Loop through configurations
        defaultSets.forEach(function ({ pattern, defaults, strategy }) {
            const matches = metalsmith.match(pattern, Object.keys(files));
            const defaultsEntries = Object.entries(defaults);
            debug.info(
                'Matched %s files to pattern "%s": %o',
                matches.length,
                pattern,
                matches
            );
            if (matches.length) {
                const setDefaults = set_defaults(defaultsEntries, strategy);
                matches.forEach((file) => {
                    setDefaults(files[file], metalsmith.metadata());
                    debug.info(
                        'Defaults set for file "%s", the resulting metadata is: %O',
                        file,
                        Object.keys(defaults).reduce((resulting, prop) => {
                            resulting[prop] = files[file][prop];
                            return resulting;
                        }, {})
                    );
                });
            } else {
                debug.warn('No matches for pattern "%s"', pattern);
            }
        });

        done();
    };
}

module.exports = defaultValues;
