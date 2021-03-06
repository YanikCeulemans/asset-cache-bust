const Task = require('data.task');
const { readFile, writeFile, stat, mkdir } = require('../taskfs.js');
const path = require('path');
const { List } = require('immutable-ext');
const chalk = require('chalk');
const meow = require('meow');
const glob = require('glob');
const package = require('../package.json');
const cacheBustHtml = require('../index.js');

//    getFileNamesFromPattern : String -> Task e (List String)
const getFileNamesFromPattern = pattern => {
    return new Task((reject, resolve) =>
        glob(pattern, {nonull: false, nodir: true}, (err, matches) => {
            if (err) return reject(err);
            if (matches.length === 0) return reject({ message: [`No files could be found that match given glob: '${pattern}'`, `Directory searched for matches: ${process.cwd()}`].join('\n') });
            return resolve(List(matches));
        })
    );
};

//    checkChangesMade : String -> String -> Task e String
const checkChangesMade = originalContents => changedContents => {
    return new Task((reject, resolve) => {
        if (originalContents === changedContents) return reject('Original contents and changed contents are equal');
        resolve(changedContents);
    });
};

//    writeToPath : String -> String -> Task e ()
const writeToPath = pathName => originalContents => contents => {
    return checkChangesMade(originalContents)(contents)
        .chain(() => 
            List(path.normalize(path.dirname(pathName)).split(path.sep))
                .map((d, index, dirs) => path.join(...dirs.toArray().slice(0, index + 1)))
                .map(dirPath => stat(dirPath)
                    // TODO: Using stat to check for existence is not recommended, refactor. See: https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
                    .chain(stats => stats.isDirectory() ? Task.of() : mkdir(dirPath))
                    .orElse((err) => mkdir(dirPath))
                )
                .reduce((acc, curr) => acc.chain(a => curr), Task.of())
                .chain(() => writeFile(pathName)(contents))
                .map(() => logger.info(`'${pathName}' -> cache busted asset urls and wrote file`))
        )
        .orElse(() => {
            logger.info(`'${pathName}' -> no cache busting replacements have been made, skipping file`);
            return Task.of();
        });
};

//    createOutputFilePath : String -> String -> String
const createOutputFilePath = outpath => filePath => {
    return path.join((outpath || '.').trim(), filePath);
};

const logger = {
    info: (msg) => console.info(chalk.blue('INFO:'), msg)
};

//    cacheBustFromGlob : String -> Object -> ()
const cacheBustFromGlob = (pattern, flags) => {
    console.time('Time consumed');
    getFileNamesFromPattern(pattern)
        .chain(filePaths =>
            filePaths
                .map(filePath =>
                    readFile(filePath)
                        .map(fileContents => {
                            logger.info(`'${filePath}' -> read file`);
                            return fileContents;
                        })
                        .chain(originalHtmlContents =>
                            cacheBustHtml(originalHtmlContents, flags.assetRoot || process.cwd(), { 
                                replaceAssetRoot: flags.replaceAssetRoot, 
                                logger: flags.verbose ? logger : null 
                            })
                            .chain(writeToPath(createOutputFilePath(flags.outPath)(filePath))(originalHtmlContents))
                        )
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
        -o, --output            Send fingerprinted HTML output to given output directory path instead of overwriting the input files
        -v, --verbose           Be verbose about what the tool is doing. Useful to check if the correct file paths are being used.
        --asset-root            The directory to consider as root for assets starting with '/'. Defaults to pwd
        --replace-asset-root    Replace the leading '/' in asset URLs with the provided string
 
    Examples
      $ ${package.name} index.html -o out/

      $ ${package.name} '*.html'
`, {
    alias: {
        o: 'output',
        v: 'verbose'
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
        cacheBustFromGlob(cli.input[0], cli.flags);
        break;
}