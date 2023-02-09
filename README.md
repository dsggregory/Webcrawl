# Browse and Screenshot
Use puppeteer and headless chromium to capture a web page. See Requirements below for how to install.

## Usage
```shell
Usage: node index.js [OPTIONS]... <URL>

Browse a URL, take a PDF screenshot, and save it plus the HTML content to local files

Arguments:
  url                          URL to browse

Options:
  -v, --version                output the version number
  -z, --timezone <timezone>    set the chromium timezone (ex. America/New_York)
                               (default: "UTC")
  -a, --useragent <userAgent>  set the request's UserAgent (default:
                               "Mozilla/5.0 (X11; Linux x86_64)
                               AppleWebKit/537.36 (KHTML, like Gecko)
                               Chrome/78.0.3904.108 Safari/537.36")
  -o, --out <basePath>         Write HTML/PDF/etc. to this base file path -
                               default based on URL
  -l, --lang <locale>          set the browser locale (default: "en_US.UTF-8")
  -h, --help                   display help for command
```
Web proxy - chromium honors standard `*_proxy` environment variables.

## Output Results
By default, results are written to a set of files based on the host of the original URL argument. The files are:

| File Ext | Description                                                                                                                                                                                     |
| ---- |-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| .har | a Chrome HAR file. Once created you can view it from a Chrome browser by opening the developer tools (right click -> inspect), click on the `Network` tab, and then drag-and-drop the har file. |
| .pdf | a PDF screenshot of the resulting page                                                                                                                                                          |
| .html | the HTML of the resulting page                                                                                                                                                                  |
| .results.json | a JSON object dump of all requests and responses. See .har as it may be of more value to you                                                                                                    |

# Requirements
The following is to install dependencies on a Mac. See puppeteer docs for other OS's.
```shell
$ brew install --cask chromium --no-quarantine
$ export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
$ export PUPPETEER_EXECUTABLE_PATH=`which chromium`
$ npm i puppeteer
```