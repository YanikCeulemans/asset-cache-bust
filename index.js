const Task = require('data.task');
const { readFile } = require('./taskfs.js');
const path = require('path');
const url = require('url');
const { List } = require('immutable-ext');
const htmlParser = require('htmlparser2');
const fingerPrinter = require('fingerprinting');
const package = require('./package.json');

//    extractStyleHrefsFromHtml : String -> Task e (List String)
const extractStyleHrefsFromHtml = html => {
    return new Task((reject, resolve) => {
        const styleHrefs = [];
        const parser = new htmlParser.Parser({
            onopentag(tagName, attrs){
                if (tagName !== 'link' || attrs.href == null || !('data-finger-print' in attrs)) return;
                styleHrefs.push(attrs.href);
            },
            onend(){
                resolve(List(styleHrefs));
            },
            onerror: reject
        });
        parser.parseComplete(html);
    });
};


//    createFileFingerPrint : String -> String -> { original: String, fingerPrinted: String }
const createFileFingerPrint = fileName => contents => {
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

//    extractFileNameFromHref : String -> Task e String
const extractFileNameFromHref = href => {
    return new Task((reject, resolve) =>
        !href ? reject('href cannot be null') : resolve(url.parse(href).pathname));
};

//    fingerPrintHtml : String -> Task e String
const cacheBustHtml = html => {
    return extractStyleHrefsFromHtml(html)
        .chain(styleHrefs => styleHrefs
            .traverse(Task.of, styleHref => extractFileNameFromHref(styleHref)
                .chain(readFile)
                .map(createFileFingerPrint(styleHref))
            )
        )
        .map(fingerPrints => fingerPrints
            .map(fingerPrint => ({ original: `href="${fingerPrint.original}"`, fingerPrinted: `href="${fingerPrint.fingerPrinted}"` }))
            .reduce((acc, fingerPrint) => acc.replace(fingerPrint.original, fingerPrint.fingerPrinted), html)
        )
};

module.exports = cacheBustHtml;