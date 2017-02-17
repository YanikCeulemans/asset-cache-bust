const Task = require('data.task');
const { readFile, writeFile, stat, mkdir } = require('./taskfs.js');
const path = require('path');
const { List } = require('immutable-ext');
const chalk = require('chalk');
const meow = require('meow');
const glob = require('glob');
const package = require('./package.json');
const cacheBustHtml = require('./index.js');
const { log } = require('./util.js');

//    getFileNamesFromPattern : String -> Task e (List String)
const getFileNamesFromPattern = pattern => {
    return new Task((reject, resolve) =>
        glob(pattern, {nonull: false}, (err, matches) => {
            if (err) return reject(err);
            if (matches.length === 0) return reject({ message: `No files could be found that match given glob: '${pattern}'` });
            return resolve(List(matches));
        })
    );
};

//    writeToPath : String -> String -> Task e ()
const writeToPath = pathName => contents => {
    return List(path.normalize(path.dirname(pathName)).split(path.sep))
        .map((d, index, dirs) => path.join(...dirs.toArray().slice(0, index + 1)))
        .map(dirPath => stat(dirPath)
            // TODO: Using stat to check for existence is not recommended, refactor. See: https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
            .chain(stats => stats.isDirectory() ? Task.of() : mkdir(dirPath))
            .orElse((err) => mkdir(dirPath))
        )
        .reduce((acc, curr) => acc.chain(a => curr), Task.of())
        .chain(() => writeFile(pathName)(contents))
        .map(() => console.log('Wrote file: ' + chalk.bold(pathName)));
};

const cacheBustFromFilePath = filePath => {
    return readFile(filePath)
        .map(fileContents => {
            console.log('Read file: ' + chalk.bold(filePath));
            return fileContents;
        })
        .chain(cacheBustHtml);
};

//    cacheBustFromGlob : String -> String -> ()
const cacheBustFromGlob = pattern => outPath => {
    console.time('Time consumed');
    getFileNamesFromPattern(pattern)
        .chain(filePaths =>
            filePaths
                .map(filePath =>
                    cacheBustFromFilePath(filePath)
                        .chain(writeToPath(path.join((outPath || '.').trim(), filePath)))
                )
                .reduce((acc, curr) => acc.chain(a => curr), Task.of())
        )
        .fork(err => {
            console.error(chalk.red('Error:'), err.message);
        }, () => {
            console.log(chalk.green.bold('Success!'));
            console.timeEnd('Time consumed');
        });
};


const cli = meow(`
    Usage
      $ ${package.name} <input>

    Input
        <input>     Required    A glob that should be used to locate files as templates for fingerprinting
    
    Options
        -o, --output  Send fingerprinted HTML output to given file path instead of overwriting the input files
 
    Examples
      $ ${package.name} index.html -o out/

      $ ${package.name} '*.html'
`, {
    alias: {
        o: 'output'
    }
});

switch(cli.input.length){
    case 0:
        console.log(
            [ ''
            , chalk.red(`Missing argument: ${chalk.bold('<input>')} HTML file path`)
            , `use ${chalk.bold(package.name + ' --help')} for usage information`
            ].join('\n')
        );
        break;
    default:
        cacheBustFromGlob(cli.input[0])(cli.flags.output);
        break;
}