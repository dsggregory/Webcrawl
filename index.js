/***
 * Browse a URL, take a screenshot, and save the HTML content to local files.
 * Usage: node index.js <URL>
 */
const {Command} = require('commander');
const puppeteer = require('puppeteer');
const fs = require('fs');
const url = require('url')

// defaults
let userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
let website_url = null

// program args
const program = new Command();
program.
    version('1.0.0', '-v, --version')
        .usage('[OPTIONS]... <URL>')
        .description('Browse a URL, take a PDF screenshot, and save it plus the HTML content to local files')
        .argument('<url>', 'URL to browse')
        .option('-z, --timezone <timezone>', 'set the chromium timezone (ex. America/New_York)', 'UTC')
        .option('-a, --useragent <userAgent>', 'set the request\'s UserAgent', userAgent)
        .option("-s, --screenshot <screenshotPath>", 'Write screenshot PDF to this file - default based on URL')
        .option('-o, --htmlout <htmlOutPath>', 'Write HTML to this file - default based on URL')
        .action((url) => {
            website_url = url
        })
        .parse(process.argv);
const options = program.opts();

let parsed = url.parse(website_url)
if (!options.screenshot) {
    options.screenshot = parsed.host + '.pdf'
}
if (!options.htmlout) {
    options.htmlout = parsed.host + '.html'
}

const vpWidth = 1280;
const vpHeight = 720;

(async () => {
    // Create a browser instance
    const browser = await puppeteer.launch({});

    // Create a new page
    const page = await browser.newPage();

    await page.setUserAgent(options.useragent);
    if (options.timezone) {
        await page.emulateTimezone(options.timezone);
    }

    // Set viewport width and height
    await page.setViewport({ width: vpWidth, height: vpHeight });

    // Open URL in current page
    await page.goto(website_url, { waitUntil: 'networkidle0', timeout: 15000 });

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

    // Close the browser instance
    await browser.close();
})();
