const assert = require('assert');
const cacheBustHtml = require('../index.js');

describe('asset-cache-bust', () => {
    it('Should not do anything given an empty string', done => {
        cacheBustHtml('')
            .fork(done, done.bind());
    });
    it('Should not do anything given null', done => {
        cacheBustHtml()
            .fork(done, done.bind());
    });
    it('Should return its input html when no matching tags were found', done => {
        const html = '<link href="nonexistant.css" rel="stylesheet" />';
        cacheBustHtml(html)
            .fork(done, bustedHtml => {
                if (bustedHtml !== html) done(Error('html without matches should not be modified'));
                done();
            });
    });
})