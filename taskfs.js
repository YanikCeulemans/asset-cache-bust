const Task = require('data.task');
const fs = require('fs');

//      readFile : String -> Task e String
exports.readFile = fileName => {
    return new Task((reject, resolve) => fs.readFile(fileName, 'utf-8', (err, contents) => err ? reject(err) : resolve(contents)));
};

//      writeFile : String -> String -> Task e ()
exports.writeFile = fileName => contents => {
    return new Task((reject, resolve) => fs.writeFile(fileName, contents, err => err ? reject(err) : resolve()));
};

//      stat : String -> Task e Stats
exports.stat = path => new Task((reject, resolve) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));

//      mkdir : String -> Task e ()
exports.mkdir = path => new Task((reject, resolve) => fs.mkdir(path, err => err ? reject(err) : resolve()));
