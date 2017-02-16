const Task = require('data.task');
const fs = require('fs');
const { List } = require('immutable-ext');
const htmlParser = require('htmlparser2');
const fingerPrinter = require('fingerprinting');
const chalk = require('chalk');
const meow = require('meow');

function readFile (fileName) {
    return new Task((reject, resolve) => fs.readFile(fileName, 'utf-8', (err, contents) => err ? reject(err) : resolve(contents)));
}

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

const writeFile = fileName => contents => {
    return new Task((reject, resolve) => fs.writeFile(fileName, contents, err => err ? reject(err) : resolve()));
}

const createFileFingerPrint = fileName => contents => {
    const separator = fileName.indexOf('?') !== -1 ? '&' : '?';
    const fingerPrint = fingerPrinter(fileName, {
        format: '{hash}',
        content: contents
    });
    return {
        original: fileName,
        fingerPrinted: `${fileName}${separator}v=${fingerPrint.file}`
    };
};

const log = description => thing => {
    console.log(description, thing);
    return thing;
};

const output = fileName => contents => {
    if (fileName == null || fileName.trim() === ''){
        return new Task((reject, resolve) => {
            process.stdout.write(contents);
            resolve();
        });
    }

    return writeFile(fileName.trim())(contents);
}

function fingerPrintFile(fileName, outName) {
    console.time('Time consumed');

    readFile(fileName)
        .chain(html =>
            extractStyleHrefsFromHtml(html)
                .chain(styleHrefs =>
                    styleHrefs
                        .traverse(Task.of, styleHref => 
                            readFile(styleHref)
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
        )
        .chain(output(outName))
        .fork(console.error.bind(console, 'error'), () => {
            if (outName == null || outName.trim() === '') return;
            
            console.log(chalk.green.bold('Success!') + `\nFingerprinted: ${fileName} -> ${outName}`);
            console.timeEnd('Time consumed');
        });
}

module.exports = fingerPrintFile;


const cli = meow(`
    Usage
      $ fingerprint <input>

    Input
        <input>     Required    The HTML file path that should be used as template for fingerprinting
    
    Options
        -o, --output  Send fingerprinted HTML output to given file path instead of stdout
 
    Examples
      $ fingerprint index.html -o out.html
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
        fingerPrintFile(cli.input[0], cli.flags.output)
        break;
}
