const Task = require('data.task');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { List } = require('immutable-ext');
const htmlParser = require('htmlparser2');
const fingerPrinter = require('fingerprinting');
const chalk = require('chalk');
const meow = require('meow');
const glob = require('glob');


//       readFile : String -> Task e String
function readFile (fileName) {
    console.log(`Reading file: ${chalk.bold(fileName)}`);
    return new Task((reject, resolve) => fs.readFile(fileName, 'utf-8', (err, contents) => err ? reject(err) : resolve(contents)));
}

//       extractStyleHrefsFromHtml : String -> Task e (List String)
function extractStyleHrefsFromHtml(html) {
    return new Task((reject, resolve) => {
        const styleHrefs = [];
        const parser = new htmlParser.Parser({
            onopentag(tagName, attrs){
                if (tagName !== 'link' || attrs.href == null || !('data-finger-print' in attrs)) return;
                styleHrefs.push(attrs.href);
            },
            onend(){
                resolve(List.of(...styleHrefs)); // Why is there no List.fromArray :'(
            },
            onerror: reject
        });
        parser.parseComplete(html);
    });
}

//    writeFile : String -> String -> Task e ()
const writeFile = fileName => contents => {
    console.log(`Writing file: ${chalk.bold(fileName)}`);
    return new Task((reject, resolve) => fs.writeFile(fileName, contents, err => err ? reject(err) : resolve()));
};

//    stat : String -> Task e Stats
const stat = path => new Task((reject, resolve) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));

//    mkdir : String -> Task e ()
const mkdir = path => new Task((reject, resolve) => fs.mkdir(path, err => err ? reject(err) : resolve()));

//    writeToPath : String -> String -> Task e ()
const writeToPath = pathName => contents => {
    return List.of(...path.normalize(path.dirname(pathName)).split(path.sep))
        .map((d, index, dirs) => 
            path.join(...dirs.toArray().slice(0, index + 1)))
        .map(dirPath =>
            // TODO: Using stat to check for existence is not recommended, refactor. See: https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
            stat(dirPath)
                .chain(stats =>
                    stats.isDirectory() ? Task.of() : mkdir(dirPath))
                .orElse((err) => mkdir(dirPath))
        )
        .reduce((acc, curr) => {
            return acc.chain(a => curr);
        })
        .chain(() => 
            writeFile(pathName)(contents));
};

//    createFileFingerPrint : String -> String -> { original: String, fingerPrinted: String }
const createFileFingerPrint = fileName => contents => {
    const separator = fileName.indexOf('?') !== -1 ? '&' : '?';
    const parsedUrl = url.parse(fileName, true);
    parsedUrl.search = null;
    
    const fingerPrint = fingerPrinter(fileName, {
        format: '{hash}',
        content: contents
    });
    parsedUrl.query.v = fingerPrint.file;
    return {
        original: fileName,
        fingerPrinted: url.format(parsedUrl)
    };
};

const log = description => thing => {
    console.log(description, thing);
    return thing;
};

//    output : String -> String -> Task e ()
const output = pathName => contents => {
    if (pathName == null || pathName.trim() === ''){
        return new Task((reject, resolve) => {
            process.stdout.write(contents);
            resolve();
        });
    }

    return writeToPath(pathName.trim())(contents);
}

const extractFileNameFromHref = href =>
    new Task((reject, resolve) =>
        !href ? reject('href cannot be null') : resolve(url.parse(href).pathname));

//       fingerPrintFile : String -> Task e String
function fingerPrintFile(fileName) {
    return readFile(fileName)
        .chain(html =>
            extractStyleHrefsFromHtml(html)
                .chain(styleHrefs =>
                    styleHrefs
                        .traverse(Task.of, styleHref =>
                            extractFileNameFromHref(styleHref)
                                .chain(readFile)
                                .map(createFileFingerPrint(styleHref))
                    )
                )
                .map(fingerPrints =>
                    fingerPrints
                        .map(fingerPrint => ({ original: `href="${fingerPrint.original}"`, fingerPrinted: `href="${fingerPrint.fingerPrinted}"` }))
                        .reduce((acc, fingerPrint) =>
                            acc.replace(fingerPrint.original, fingerPrint.fingerPrinted), html
                        )
                )
        );
}

//       getFilesFromPattern : String -> Task e (List String)
function getFilesFromPattern(pattern) {
    return new Task((reject, resolve) => 
        glob(pattern, {nonull: false}, (err, matches) => 
            err ? reject(err) : resolve(List.of(...matches))));
}

//       fingerPrintFrom : (String, String) -> ()
function fingerPrintFrom(pattern, outPath){
    console.time('Time consumed');
    getFilesFromPattern(pattern)
        .chain(filePaths =>
            filePaths
                .map(filePath =>
                    fingerPrintFile(filePath)
                        .chain(output(path.join(outPath || '.', filePath)))
                )
                .reduce((acc, curr) => acc.chain(a => curr))
        )
        .fork(console.error.bind(console, 'error'), () => {
            if (outPath == null || outPath.trim() === '') return;
            
            console.log(chalk.green.bold('Success!'));
            console.timeEnd('Time consumed');
        });
}

module.exports = fingerPrintFile;


const cli = meow(`
    Usage
      $ asset-cache-bust <input>

    Input
        <input>     Required    A glob that should be used to locate files as templates for fingerprinting
    
    Options
        -o, --output  Send fingerprinted HTML output to given file path instead of overwriting the input files
 
    Examples
      $ asset-cache-bust index.html -o out/

      $ asset-cache-bust '*.html'
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
            , `use ${chalk.bold('fingerprint --help')} for usage information`
            ].join('\n')
        );
        break;
    default:
        fingerPrintFrom(cli.input[0], cli.flags.output);
        break;
}
