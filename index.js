/***
 * Browse a URL, take a screenshot, and save the HTML content to local files.
 * Usage: node index.js <URL>
 */
const {Command} = require('commander');
const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const fs = require('fs');
const url = require('url')

// defaults
let userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
let website_url = null;
let lang = process.env.LANG;
if (!lang) {
    lang = 'en-US';
}

// program args
const program = new Command();
program.
    version('1.0.0', '-v, --version')
        .usage('[OPTIONS]... <URL>')
        .description('Browse a URL, take a PDF screenshot, and save it plus the HTML content to local files')
        .argument('<url>', 'URL to browse')
        .option('-z, --timezone <timezone>', 'set the chromium timezone (ex. America/New_York)', 'UTC')
        .option('-a, --useragent <userAgent>', 'set the request\'s UserAgent', userAgent)
        .option('-o, --out <basePath>', 'Write HTML/PDF/etc. to this base file path - default based on URL')
    .option('-l, --lang <locale>', 'set the browser locale', lang)
        .action((url) => {
            website_url = url
        })
        .parse(process.argv);
const options = program.opts();

let parsed = url.parse(website_url)
if (!options.out) {
    options.out = parsed.host
}
options.screenshot = options.out + '.pdf';
options.htmlout = options.out + '.html';
options.resultsout = options.out + '.results.json'

const vpWidth = 1280;
const vpHeight = 720;

(async () => {
    // Create a browser instance
    const browser = await puppeteer.launch({
        args: [`--lang=${options.lang}`]
    });

    // Create a new page
    const page = await browser.newPage();

    await page.setUserAgent(options.useragent);
    if (options.timezone) {
        await page.emulateTimezone(options.timezone);
    }

    // Set viewport width and height
    await page.setViewport({ width: vpWidth, height: vpHeight });

    // Capture all network requests
    const result = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
        request_client({
            uri: request.url(),
            resolveWithFullResponse: true,
        }).then(response => {
            const request_url = request.url();
            const request_headers = request.headers();
            const request_post_data = request.postData();
            const response_headers = response.headers;
            const response_size = response_headers['content-length'];
            const response_body = response.body;

            result.push({
                request_url,
                request_headers,
                request_post_data,
                response_headers,
                response_size,
                response_body,
            });

            //console.log(result);
            request.continue();
        }).catch(error => {
            //console.error(error);
            result.push({error})
            request.abort();
        });
    });

    // Open URL in current page
    await page.goto(website_url, { waitUntil: 'networkidle0', timeout: 15000 });

    // save the PDF
    await page.pdf({
        path: options.screenshot,
        format: 'A4',
        fullPage: true,
    });
    console.log(`Wrote screen capture to ${options.screenshot}`)

    // save the content
    const html = await page.content();
    try {
        fs.writeFileSync(options.htmlout, html);
        console.log(`Wrote HTML to ${options.htmlout}`)
    } catch (err) {
        console.error(err);
    }

    // save the network trace results
    try {
        fs.writeFileSync(options.resultsout, JSON.stringify(result, null, 2))
        console.log(`Wrote network trace to ${options.resultsout}`)
    } catch (err) {
        console.error(err)
    }

    // Close the browser instance
    await browser.close();
})();
