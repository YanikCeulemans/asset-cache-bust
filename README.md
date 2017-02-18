# Asset-cache-bust
Bust the browser cache of your assets using query strings based on actual asset content.

## What it does
This module parses HTML and finds `<link>` tags that contain a `href` and `data-finger-print` 
attribute. It then extracts the URL from the `href` attribute and tries to read that file
from disk. If the file was successfully read, it uses its content to create an MD5 hash. This
hash is then used to append to the original `href` URL as a query parameter in the form
of: `v=md5stringGoesHere`. When all matched URLs have been replaced in the original HTML, it
will be passed to the success callback.


## How to use it
This module can used as a node module or through its CLI.

> The given HTML should contain `<link>` tags in the following format for this package to
> replace their `href`s: `<link href="asset.css" data-finger-print />`.

To use it as a node module, install it using: `npm install asset-cache-bust`

See following example:
```
const assetCacheBust = require('asset-cache-bust');
assetCacheBust(validHtml)
    .fork(
        error => console.log(error), // Do something usefull with the error
        cacheBustedHtml => console.log(cacheBustedHtml) // Do something with the cache busted HTML
    );
```

To use the CLI you have 2 options:

* Install this package globally:
    1. Install this module using `npm install -g asset-cache-bust`
    2. Cache bust html files using `asset-cache-bust *.html` for example
    > type `asset-cache-bust --help` for help and options
* Install this package locally:
    1. Install this module using `npm install asset-cache-bust`
    2. Create an npm script in your `package.json` file with a fitting name and corresponding value.
    e.g. `"bust-cache": "asset-cache-bust *.html"`
    3. Run your npm script using `npm run <script name from above goes here>`
    
> The default behaviour of the CLI is to replace the given HTML files with the cache
> busted version. See the CLI help for more information and options.

> If no matching tags were found and thus no replacements can be made, no files will be
> changed.

## Contributing
I will create a seperate markdown file with documentation for contribution if
I get requests from people who would like to contribute.

## Licence
MIT (See LICENCE file)
