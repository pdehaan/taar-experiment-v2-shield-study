/* eslint-env node */

/* This file is a helper script that will install the extension from the .xpi
 * file and setup useful preferences for debugging. This is the same setup
 * that the automated Selenium-Webdriver/Mocha tests run, except in this case
 * we can manually interact with the browser.
 * NOTE: If changes are made, they will not be reflected in the browser upon
 * reloading, as the .xpi file has not been recreated.
 */

console.log("Starting up firefox");

const firefox = require("selenium-webdriver/firefox");
const path = require("path");
const Context = firefox.Context;
const webdriver = require("selenium-webdriver");
const Key = webdriver.Key;

const {
  installAddon,
  promiseSetupDriver,
  getTelemetryPings,
  printPings,
  takeScreenshot,
  writePingsJson,
  promiseUrlBar,
  MODIFIER_KEY
} = require("./test/utils");


const HELP = `
env vars:

- XPI (optional): path to xpi / addon

  installs $XPI as a temporary addon.

  Note: must be 'legacy signed' if on Beta or Release.

- FIREFOX_BINARY :  nightly | beta | firefox

Future will clean up this interface a bit!
- prefs
- multiple addons
- re-use or create profiles, etc.

`;

const minimistHandler = {
  boolean: [ 'help' ],
  alias: { h: 'help', v: 'version' },
  '--': true,
};


(async() => {
  const minimist = require("minimist");
  const parsedArgs = minimist(process.argv.slice(2), minimistHandler);
  if (parsedArgs.help) {
    console.log(HELP);
    process.exit();
  }

  try {
    const driver = await promiseSetupDriver();
    console.log("Firefox started");

    // install the addon
    if (process.env.XPI) {
      const fileLocation = path.join(process.cwd(), process.env.XPI);
      console.log(fileLocation)
      await installAddon(driver, fileLocation);
      console.log("Load temporary addon.");
    }

    // navigate to about:debugging
    driver.setContext(Context.CONTENT);
    driver.get("about:debugging");

    // open the browser console
    driver.setContext(Context.CHROME);
    const urlBar = await promiseUrlBar(driver);
    const openBrowserConsole = Key.chord(MODIFIER_KEY, Key.SHIFT, "j");
    await urlBar.sendKeys(openBrowserConsole);

    console.log("The addon should now be loaded and you should be able to interact with the addon in the newly opened Firefox instance.");

    // allow our shield study addon some time to start
    console.log("Waiting 2 seconds to allow for initial telemetry to be sent");
    await driver.sleep(2000);

    await takeScreenshot(driver);
    console.log("Screenshot dumped");

    const telemetryPingsFilterOptions = {
      type: [ "shield-study", "shield-study-addon" ],
      headersOnly: false,
    };
    const pings = await getTelemetryPings(driver, telemetryPingsFilterOptions);
    console.log("Shield study telemetry pings: ");
    printPings(pings);

    writePingsJson(pings);
    console.log("Shield study telemetry pings written to pings.json");

  } catch (e) {
    console.error(e); // eslint-disable-line no-console
  }
})();
