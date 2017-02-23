const Task = require('data.task');
const Maybe = require('data.maybe');
const { readFile } = require('./taskfs.js');
const path = require('path');
const urlUtil = require('url');
const { List } = require('immutable-ext');
const htmlParser = require('htmlparser2');
const fingerPrinter = require('fingerprinting');
const { id, always, taskFromNullable, getObjectProperty } = require('./util.js');

//    extractAssetUrlsFromHtml : String -> Task e (List String)
const extractAssetUrlsFromHtml = html => {
    return new Task((reject, resolve) => {
        const styleHrefs = [];
        const parser = new htmlParser.Parser({
            onopentag(tagName, attrs){
                if (!('data-finger-print' in attrs)) return;

                switch (tagName) {
                    case 'link':
                        styleHrefs.push(attrs.href);
                        break;
                    case 'script':
                        styleHrefs.push(attrs.src);
                        break;
                    default:
                        return;
                }
            },
            onend(){
                resolve(List(styleHrefs));
            },
            onerror: reject
        });
        parser.parseComplete(html);
    });
};


//    createFileFingerPrint : String -> Maybe Any -> String -> { original: String, fingerPrinted: String }
const createFileFingerPrint = fileName => assetRootReplacement => contents => {
    const url = assetRootReplacement
        .chain(newRoot => {
            if (typeof newRoot !== 'string') return Maybe.Nothing();
            return Maybe.Just(urlUtil.resolve(newRoot, fileName));
        })
        .getOrElse(fileName);
    
    const parsedUrl = urlUtil.parse(url, true);
    parsedUrl.search = null;
    
    const fingerPrint = fingerPrinter(fileName, {
        format: '{hash}',
        content: contents
    });
    parsedUrl.query.v = fingerPrint.file;
    return {
        original: fileName,
        fingerPrinted: urlUtil.format(parsedUrl)
    };
};

//    extractFileNameFromUrl : String -> Task e String
const extractFileNameFromUrl = url => {
    return new Task((reject, resolve) =>
        !url ? reject({ message: 'url cannot be null' }) : resolve(urlUtil.parse(url).pathname));
};

//    mergeRootWithFileName : String -> String -> String
const mergeRootWithFileName = root => fileName => {
    return path.join(root, fileName);
};

//    cacheBustHtml : (String, String) -> Task e String
const cacheBustHtml = (html, assetsRoot, options) => {
    return taskFromNullable({ message: 'The asset root cannot be null or undefined' })(assetsRoot)
        .chain(assetsRoot => 
            extractAssetUrlsFromHtml(html)
                .chain(styleHrefs =>
                    styleHrefs
                        .traverse(Task.of, styleHref => 
                            extractFileNameFromUrl(styleHref)
                                .map(mergeRootWithFileName(assetsRoot))
                                .chain(readFile) // TODO: How do I pull this out so I can unit test this properly?
                                .map(createFileFingerPrint(styleHref)(getObjectProperty('replaceAssetRoot')(options)))
                                .orElse(always(Task.of()))
                    )
                )
                .map(fingerPrints => fingerPrints.filter(id))
                .map(fingerPrints => fingerPrints
                    .reduce((acc, fingerPrint) => acc.replace(fingerPrint.original, fingerPrint.fingerPrinted), html)
                )
        )
};

module.exports = cacheBustHtml;