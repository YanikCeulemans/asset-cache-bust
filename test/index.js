const cacheBustHtml = require('../index.js');
const { expect } = require('chai');

const wrapExpect = (assertionFn, doneFn) => {
    try{
        assertionFn();
        doneFn();
    }catch(e) {
        console.log('entered error catch');
        doneFn(e);
    }
};

describe('asset-cache-bust', () => {
    describe('without asset root', () => {
        it('should return a rejected task with an error message', done => {
            cacheBustHtml(null, null)
                .fork(e => {
                    wrapExpect(
                        () => expect(e).to.not.be.null,
                        done
                    );
                }, () => done(Error('Expected the success callback to not be called')));
        });
    });
    describe('with asset root', () => {
        it('should not do anything given null', done => {
            cacheBustHtml(null, '.')
                .fork(done, (bustedHtml) => {
                    wrapExpect(
                        () => expect(bustedHtml).to.be.null,
                        done
                    );
                });
        });
        it('should not do anything given an empty string', done => {
            cacheBustHtml('', '.')
                .fork(done, (bustedHtml) => {
                    wrapExpect(
                        () => expect(bustedHtml).to.equal(''),
                        done
                    );
                });
        });
        it('should not do anything given invalid HTML', done => {
            const html = 'link href="test/existant.css" rel="stylesheet" data-finger-print';
            cacheBustHtml(html, '.')
                .fork(done, (bustedHtml) => {
                    wrapExpect(
                        () => expect(bustedHtml).to.equal(html),
                        done
                    );
                });
        });
        it('should skip assets that could not be found', done => {
            const html = '<link href="/somedir/other.css" rel="stylesheet" data-finger-print />';
            cacheBustHtml(html, '.')
                .fork(done, bustedHtml => {
                    wrapExpect(
                        () => expect(bustedHtml).to.equal(html),
                        done
                    );
                });
        });
        it('should skip assets that are not contained in a matching tag', done => {
            const html = `
                <link href="nonexistant.css" rel="stylesheet" />
            `;
            cacheBustHtml(html, '.')
                .fork(done, bustedHtml => {
                    wrapExpect(
                        () => expect(bustedHtml).to.contain('href="nonexistant.css"'),
                        done
                    );
                })
        });
        it('should skip links that do not have an href attribute', done => {
            const html = '<link rel="stylesheet" data-finger-print />';
            cacheBustHtml(html, '.')
                .fork(done, (bustedHtml) => {
                    wrapExpect(
                        () => expect(bustedHtml).to.equal(html),
                        done
                    );
                });
        });
        it('should skip links that have an empty href attribute', done => {
            const html = '<link href="" rel="stylesheet" data-finger-print />';
            cacheBustHtml(html, '.')
                .fork(done, (result) => {
                    wrapExpect(
                        () => expect(result).to.equal(html),
                        done
                    );
                });
        });
        it('should process links that have a root prepended href attribute', done => {
            const html = '<link href="/test/existant.css" rel="stylesheet" data-finger-print />';
            cacheBustHtml(html, '.')
                .fork(done, bustedHtml => {
                    wrapExpect(
                        () => expect(bustedHtml).to.match(/"\/test\/existant\.css\?v=([a-z0-9])+"/),
                        done
                    );
                });
        });
        it('should process assets and add finger prints to their urls', done => {
            const html = `
                <link href="test/existant.css" rel="stylesheet" data-finger-print />
                <script src="test/script.js" data-finger-print></script>
            `;
            cacheBustHtml(html, '.')
                .fork(done, bustedHtml => {
                    wrapExpect(
                        () => expect(bustedHtml).to.match(/"test\/existant\.css\?v=([a-z0-9])+"/).and.to.match(/"test\/script\.js\?v=([a-z0-9])+"/),
                        done
                    );
                });
        });
        it('should correctly resolve file urls for a different root', done => {
            const html = '<link href="/somedir/other.css" rel="stylesheet" data-finger-print />';

            cacheBustHtml(html, 'test/')
                .fork(done, bustedHtml => {
                    wrapExpect(
                        () => expect(bustedHtml).to.match(/"\/somedir\/other\.css\?v=([a-z0-9])+"/),
                        done
                    );
                });
        });
        describe('with replace asset root option', () => {
            it('should not replace the asset root if the option is null', done => {
                const html = '<link href="/test/existant.css" rel="stylesheet" data-finger-print />';
                const rootReplacement = null;

                cacheBustHtml(html, '.', {replaceAssetRoot: rootReplacement})
                    .fork(done, bustedHtml => {
                        wrapExpect(
                            () => expect(bustedHtml).to.match(/"\/test\/existant\.css\?v=([a-z0-9])+"/),
                            done
                        );
                    });
            });
            it('should not replace the asset root if the option does not contain a string', done => {
                const html = '<link href="/test/existant.css" rel="stylesheet" data-finger-print />';
                const rootReplacement = 1;

                cacheBustHtml(html, '.', {replaceAssetRoot: rootReplacement})
                    .fork(done, bustedHtml => {
                        wrapExpect(
                            () => expect(bustedHtml).to.match(/"\/test\/existant\.css\?v=([a-z0-9])+"/),
                            done
                        );
                    });
            });
            it('should correctly replace the asset root with the given option value', done => {
                const html = '<link href="/test/existant.css" rel="stylesheet" data-finger-print />';
                const rootReplacement = 'http://localhost';

                cacheBustHtml(html, '.', {replaceAssetRoot: rootReplacement})
                    .fork(done, bustedHtml => {
                        wrapExpect(
                            () => expect(bustedHtml).to.match(/"http:\/\/localhost\/test\/existant\.css\?v=([a-z0-9])+"/),
                            done
                        );
                    });
            });
        });
        describe('with events listener option', () => {
            it('should report skipped matched assets as info', done => {
                const html = '<link href="undefined.css" rel="stylesheet" data-finger-print />';
                const infoMsgs = [];
                const eventListeners = {
                    info: infoMsgs.push.bind(infoMsgs)
                };

                cacheBustHtml(html, '.', {eventListeners: eventListeners})
                    .fork(done, bustedHtml => {
                        wrapExpect(
                            () => expect(infoMsgs.some(msg => /Skipping matched asset 'undefined\.css' because it could not be found\./.test(msg))).to.be.true,
                            done
                        );
                    });
            });
            it('should throw a TypeError when provided info is not a function', () => {
                const html = '<link href="undefined.css" rel="stylesheet" data-finger-print />';
                const eventListeners = {
                    info: 1
                };
                expect(() => cacheBustHtml(html, '.', {eventListeners: eventListeners}).fork(() => {}, () => {})).to.throw(TypeError)
            });
        });
    });
});