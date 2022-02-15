/*
Copyright (c) 2013 Fractal <contact@wearefractal.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* glob-watcher, 2.0.0, with minor modificiations. This was copied into the
 * repository because all versions of glob-watcher (3.x through 5.x) rely on a
 * package that's flagged as being vulnerable. */

var gaze = require("gaze");
var EventEmitter = require("events").EventEmitter;

function onWatch(out, cb) {
    return function (err, rwatcher) {
        if (err) out.emit("error", err);
        rwatcher.on("all", function (evt, path, old) {
            var outEvt = { type: evt, path: path };
            if (old) outEvt.old = old;
            out.emit("change", outEvt);
            if (cb) cb();
        });
    };
}

module.exports = function (glob, cb) {
    var out = new EventEmitter();
    var watcher = gaze(glob, {}, onWatch(out, cb));

    watcher.on("end", out.emit.bind(out, "end"));
    watcher.on("error", out.emit.bind(out, "error"));
    watcher.on("ready", out.emit.bind(out, "ready"));
    watcher.on("nomatch", out.emit.bind(out, "nomatch"));

    out.end = function () {
        return watcher.close();
    };
    out.add = function (glob, cb) {
        return watcher.add(glob, onWatch(out, cb));
    };
    out.remove = function (glob) {
        return watcher.remove(glob);
    };
    out._watcher = watcher;

    return out;
};
