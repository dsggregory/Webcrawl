/***
 * Browse a URL, take a screenshot, and save the HTML content to local files.
 * Usage: node index.js <URL>
 */
const {Command} = require('commander');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const {executablePath} = require('puppeteer')
const request_client = require('request-promise-native');
const {harFromMessages} = require('chrome-har');
const fs = require('fs');
const url = require('url');
const which = require('which')
const {promisify} = require('util');

// defaults
let userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
let website_url = null;
let lang = process.env.LANG;
if (!lang) {
    lang = 'en-US';
}

// program args
const program = new Command();
program.version('1.0.0', '-v, --version')
    .usage('[OPTIONS]... <URL>')
    .description('Browse a URL, take a PDF screenshot, and save it plus the HTML content to local files')
    .argument('<url>', 'URL to browse')
    .option('-o, --out <basePath>', 'Write HTML/PDF/etc. to this base file path - default based on URL')
    .option('-j, --jpeg', 'Write a JPEG format of the screen capture vs. PDF by default')
    .option('-z, --timezone <timezone>', 'set the chromium timezone (ex. America/New_York)', 'UTC')
    .option('-a, --useragent <userAgent>', 'set the request\'s UserAgent', userAgent)
    .option('-l, --lang <locale>', 'set the browser locale', lang)
    .option('-t, --timeout <secs>', 'Set the timeout (in seconds) on requests', 15)
    .action((url) => {
        website_url = url
    })
    .parse(process.argv);
const options = program.opts();

let parsed = url.parse(website_url)
if (!options.out) {
    options.out = parsed.host
}
options.screenshot = options.out
options.htmlout = options.out + '.html';
options.resultsout = options.out + '.results.json'
options.harout = options.out + '.har'

const vpWidth = 1280;
const vpHeight = 720;

(async () => {
    // puppeteer needs to know where the chromium binary is located
    let chromiumPath = "";
    try {
        // this will work if PUPPETEER_EXECUTABLE_PATH environment is defined
        chromiumPath = executablePath();
    } catch (e) {
        // look for it in $PATH
        chromiumPath = await which('chromium')
    }
    // Create a browser instance
    const browser = await puppeteer.launch({
        args: [`--lang=${options.lang}`],
        executablePath: chromiumPath,
    });

    // Create a new page
    const page = await browser.newPage();

    await page.setUserAgent(options.useragent);
    if (options.timezone) {
        await page.emulateTimezone(options.timezone);
    }

    // any other extra http request headers
    //await page.setExtraHTTPHeaders()

    // Set viewport width and height
    await page.setViewport({width: vpWidth, height: vpHeight});

    // Save request failures and console messages
    let consolePath = options.out + '.console'
    console.log(`Writing console logs to ${consolePath}`);
    let consoleFp = fs.createWriteStream(consolePath, {});
    page.on('requestfailed', request => {
        consoleFp.write(request.url() + ' ' + request.failure().errorText + "\n");
    });
    page.on('console', (message) =>
        consoleFp.write(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}\n`))

    // Capture all events to be written to Chrome HAR file
    const events = [];
    // event types to observe
    const observe = [
        'Page.loadEventFired',
        'Page.domContentEventFired',
        'Page.frameStartedLoading',
        'Page.frameAttached',
        'Network.requestWillBeSent',
        'Network.requestServedFromCache',
        'Network.dataReceived',
        'Network.responseReceived',
        'Network.resourceChangedPriority',
        'Network.loadingFinished',
        'Network.loadingFailed',
    ];
    // register events listeners
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Network.enable');
    observe.forEach(method => {
        client.on(method, params => {
            events.push({method, params});
        });
    });


    // Capture all requests/responses
    const result = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
        consoleFp.write(`REQ: ${request.url()}\n`);
        request_client({
            uri: request.url(),
            resolveWithFullResponse: true,
            timeout: 5000,
        }).then(response => {
            const request_url = request.url();
            const request_headers = request.headers();
            const request_post_data = request.postData();
            const response_code = response.statusCode;
            const response_headers = response.headers;
            const response_size = response_headers['content-length'];
            const response_body = response.body;

            result.push({
                request_url,
                request_headers,
                request_post_data,
                response_code,
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
    try {
        await page.goto(website_url, {waitUntil: 'networkidle0', timeout: options.timeout * 1000});
    } catch (e) {
        consoleFp.write(`ERR: ${e.message}\n`)
        console.log(e)
    }

    // save the screen capture
    let scPath = "";
    if (options.jpeg) {
        // save the JPEG
        scPath = options.screenshot + '.jpg'
        await page.screenshot({
            path: scPath,
            fullPage: true,
        });
    } else {
        // save the PDF
        scPath = options.screenshot + '.pdf'
        await page.pdf({
            path: scPath,
            format: 'A4',
            fullPage: true,
        });
    }
    console.log(`Wrote screen capture to ${scPath}`);

    // save the network trace results
    await promisify(fs.writeFile)(options.resultsout, JSON.stringify(result, null, 2));
    console.log(`Wrote network trace to ${options.resultsout}`);

    // save the Chrome HAR file for events
    const har = harFromMessages(events);
    await promisify(fs.writeFile)(options.harout, JSON.stringify(har));
    console.log(`Wrote events to ${options.harout}`);

    // save the content
    try {
        const html = await page.content({timeout: 15000});
        await promisify(fs.writeFile)(options.htmlout, html);
        console.log(`Wrote HTML to ${options.htmlout}`);
    } catch (e) {
        console.error(e)
        consoleFp.write(`ERR: ${e.message}\n`)
    }
    // Close the browser instance
    await browser.close();

})();
