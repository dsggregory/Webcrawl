# Browse and Screenshot
Use puppeteer and headless chromium to capture a web page. See Requirements below for how to install.

## Usage
```shell
Usage: index [OPTIONS]... <URL>

Browse a URL, take a PDF screenshot, and save it plus the HTML content to local files

Arguments:
  url                          URL to browse

Options:
  -v, --version                      output the version number
  -z, --timezone <timezone>          set the chromium timezone (ex.
                                     America/New_York) (default: "UTC")
  -a, --useragent <useragent>        set the request's UserAgent (default:
                                     "Mozilla/5.0 (X11; Linux x86_64)
                                     AppleWebKit/537.36 (KHTML, like Gecko)
                                     Chrome/78.0.3904.108 Safari/537.36")
  -s, --screenshot <screenshotPath>  Write screenshot PDF to this file -
                                     default based on URL
  -o, --htmlout <htmlOutPath>        Write HTML to this file - default based on
                                     URL
  -h, --help                         display help for command
```
Web proxy - chromium honors standard `*_proxy` environment variables.

# Requirements
```shell
$ brew install --cask chromium --no-quarantine
$ export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
$ export PUPPETEER_EXECUTABLE_PATH=`which chromium`
$ npm i pupetteer
```