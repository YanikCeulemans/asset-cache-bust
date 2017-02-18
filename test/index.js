const cacheBustHtml = require('../index.js');

describe('asset-cache-bust', () => {
    it('Should not do anything given null', done => {
        cacheBustHtml()
            .fork(done, (result) => {
                if (result != null) return done(Error());
                done()
            });
    });
    it('Should not do anything given an empty string', done => {
        cacheBustHtml('')
            .fork(done, (result) => {
                if (result !== '') return done(Error());
                done()
            });
    });
    it('Should not do anything given invalid HTML', done => {
        const html = 'link href="test/existant.css" rel="stylesheet" data-finger-print';
        cacheBustHtml(html)
            .fork(done, (result) => {
                if (result !== html) return done(Error());
                done()
            });
    });
    it('Should skip assets that could not be found', done => {
        const html = '<link href="nonexistant.css" rel="stylesheet" data-finger-print />';
        cacheBustHtml(html)
            .fork(done, bustedHtml => {
                if (bustedHtml !== html) return done(Error());
                done();
            });
    });
    it('Should skip assets that that are not contained in a matching tag', done => {
        const html = `
            <link href="nonexistant.css" rel="stylesheet" />
        `;
        cacheBustHtml(html)
            .fork(done, bustedHtml => {
                if (bustedHtml.indexOf('href="nonexistant.css"') === -1) return done(Error());
                done();
            })
    });
    it('Should skip links that do not have an href attribute', done => {
        const html = '<link rel="stylesheet" data-finger-print />';
        cacheBustHtml(html)
            .fork(done, (result) => {
                if (result !== html) return done(Error());
                done()
            });
    });
    it('Should skip links that have an empty href attribute', done => {
        const html = '<link href="" rel="stylesheet" data-finger-print />';
        cacheBustHtml(html)
            .fork(done, (result) => {
                if (result !== html) return done(Error());
                done()
            });
    });
    it('Should process assets and add finger prints to their urls', done => {
        const html = '<link href="test/existant.css" rel="stylesheet" data-finger-print />';
        cacheBustHtml(html)
            .fork(done, bustedHtml => {
                if (!/"test\/existant\.css\?v=([a-z0-9])+"/.test(bustedHtml)) return done(Error());
                done();
            });
    });
})