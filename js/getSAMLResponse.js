//////////////////////////////////////////////////////////////////////////////
// Project:       Create Field Admin Automation (Pony Project)
// Function:      getSAMLResponse(username, password) 
// Author:        Jon Howard, Jeremy Perkins
// Date Created:  07/20/2020
//
// Purpose:       Function to use Puppeteer to pull the SAMLResponse  
//                from the header during authentication using a given username/password. 
//                Info on Puppeteer and why we are using it below.
//
// Usage:         var samlResponse = await getSAMLResponse(username, password);
//
// Parameters: 
//    username:   A Canvas username
//    password:   A Canvas password
//
// Return:        A SAMLResponse string for that user
//
// Revision History:
// Date:        Author         Version    Notes
// 07/20/2020   Jon Howard     1          Initial version
//
//////////////////////////////////////////////////////////////////////////////
// Using Puppeteer on this. Puppeteer is a Node library which provides a high-level API to control headless Chrome or Chromium over the DevTools Protocol. 
// It can also be configured to use full (non-headless) Chrome or Chromium.
// It's similar in concept to Selenium but Selenium didn't give us access to the full network traffic. It only gave us performance logs.
// More info at https://developers.google.com/web/tools/puppeteer
// What can I do with Puppeteer?
// Most things that you can do manually in the browser can be done using Puppeteer! Here are a few examples to get you started:
// 1. Generate screenshots and PDFs of pages.
// 2. Crawl a SPA (Single-Page Application) and generate pre-rendered content (i.e. "SSR" (Server-Side Rendering)).
// 3. Automate form submission, UI testing, keyboard input, etc.
// 4. Create an up-to-date, automated testing environment. Run your tests directly in the latest version of Chrome using the latest JavaScript and browser features.
// 5. Capture a timeline trace of your site to help diagnose performance issues.
// 6. Test Chrome Extensions.
// We are using it because it allows us to capture the full network traffic so we can pull the SAMLResponse from the header during authentication
const PUPPETEER = require('puppeteer'); // For browser automation
const REQUEST_CLIENT = require('request-promise-native'); // Needed by Puppeteer
const QUERYSTRING = require('query-string'); // Used to pull SAMLRequest from header
const DOTENV = require('dotenv');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports =
  async function getSAMLResponse(domain, username, password) {
    return new Promise(async (resolve, reject) => {
      'use strict';
      // Requires
      // Used to store prod token in local env var
      // Declare vars
      await sleep(10000)
      var BROWSER; // The browser window we'll open/use
      var result = []; // The result arrays from the request intercepts. result is no longer used
      // result was used in function request intercept that is only being used for page2 now
      var result2 = []; // Leaving result there in case we need to debug the first page opening later
      var samlResponse; // The final SAMLResponse we are returning
      // NOT SURE WHAT THIS NEEDS TO BE WHEN THIS CODE GOES LIVE
      var canvasInstance = "https://" + domain + "/login/canvas?global_includes=0";
      var samlInstance = "https://" + domain + "/login/saml?global_includes=0";
      // Debug/testing flags
      const DEBUG = false; // Write more info to the console
      const SHOWFULLRESPONSE = false; // Used for debugging. This logs the entire response data to the console
      // Load the dev env variables 
      // There's no need to check if .env exists, dotenv will check this for you. 
      // It will show a small warning which can be disabled when using this in production.
      DOTENV.config();
      // This bypasses the SSL cert errors I was getting
      // Without this, I get 'RequestError: Error: unable to verify the first certificate'
      // We will get this error that can be igonred:
      // "node:39002) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification."
      // Possible fix https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs/32440021#32440021
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      // Log the instance and credentials if debugging
      if (DEBUG === true) {
        console.log("Canvas Instance: " + canvasInstance);
        console.log("Username: " + username);
        console.log("Password: " + password);
      }

      ///////////////////////////////////////////////////
      // // This is the firefox setup
      // const firefoxOptions = {
      //   product: 'firefox',
      //   extraPrefsFirefox: {
      //     // Enable additional Firefox logging from its protocol implementation
      //     // 'remote.log.level': 'Trace',
      //   },
      //   // Make browser logs visible
      //   dumpio: true,
      //   headless: false,
      //   devtools: true
      // };
      // const firefoxProdOptions = {
      //   product: 'firefox',
      //   extraPrefsFirefox: {
      //     // Enable additional Firefox logging from its protocol implementation
      //     // 'remote.log.level': 'Trace',
      //   },
      //   // Make browser logs visible
      //   dumpio: true,
      //   headless: false,
      // };
      // // Launch the browser
      // if (DEBUG === true) {
      //   BROWSER = await PUPPETEER.launch(firefoxOptions); // Full bowser (non-Headless)
      // } else {
      //   BROWSER = await PUPPETEER.launch(firefoxProdOptions); // Headless 
      // }

      ///////////////////////////////////////////////////

      // This is the regular chrome process
      if (DEBUG == true) {

        console.log("Canvas Instance: " + canvasInstance);
        console.log("Username: " + username);
        console.log("Password: " + password);
      }
      // Launch the browser
      if (DEBUG == true) {
        BROWSER = await PUPPETEER.launch({
          headless: false,
          devtools: true
        }, ); // Full bowser (non-Headless)
      } else {
        BROWSER = await PUPPETEER.launch({
          headless: true
        }); // Headless 
      }
      ///////////////////////////////////////////////////
      // Open a new (blank) page and go to my sandbox. 
      // Originally was waitUntil: 'networkidle0' from example code but load is the default
      // You can ignore the error NODE_TLS_REJECT_UNAUTHORIZED - we are ignoring SSL to make the process work
      // console.log(await BROWSER.version());
      console.log("Getting SAML Response");
      // console.log("** You can ignore the follow error about Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' **");
      // console.log("");
      var page2 = await BROWSER.newPage();
      await page2.goto(samlInstance);
      var page = await BROWSER.newPage();
      await page.goto(canvasInstance, {
        waitUntil: 'load',
      });
      // Fill in username/pw then login
      await page.type('#pseudonym_session_unique_id', username);
      await page.type('#pseudonym_session_password', password);
      await page.click('.Button--login');
      await page.waitForNavigation('load'); // Wait for Navigation
      // Agree to terms of use if page shows up
      try {
        await page.click('input[type=checkbox]');
        await page.click('.Button--primary');
        await page.waitForNavigation(); // Wait for Navigation
      } catch (error) {
        // console.log("The acceptable use terms didn't appear.")
      }

      // Open a second tab. When we used the first tab/page, it wouldn't navigate to the next page
      var page2 = await BROWSER.newPage();
      // Activating request interception. This enables request.abort, request.continue and request.respond methods. 
      // This provides the capability to view/modify network requests that are made by a page.
      // Once request interception is enabled, every request will stall unless it's continued, responded or aborted. 
      // For more info, see https://github.com/puppeteer/puppeteer/blob/v1.7.0/docs/api.md#pagesetrequestinterceptionvalue
      await page2.setRequestInterception(true);
      // Process the response (when it comes as a result of going to the page).
      // The page is loaded following this definition
      page2.on('request', request2 => {
        REQUEST_CLIENT({
          uri: request2.url(),
          resolveWithFullResponse: true,
        }).then(response2 => {
          var request_url = request2.url();
          var request_headers = request2.headers();
          var request_post_data = request2.postData();
          var response_headers = response2.headers;
          var response_size = response_headers['content-length'];
          var response_body = response2.body;
          if (SHOWFULLRESPONSE === true) {
            result.push({
              request_url,
              request_headers,
              request_post_data,
              response_headers,
              response_size,
              response_body,
            });
          }
          // We are looking for this particular URL https://adminconsole.canvaslms.com/login?so
          // When we get it, parse the post data using the QUERYSTRING library to get the SAMLRepsonse paramter
          if (request_url.indexOf('https://adminconsole.canvaslms.com/login?so') > -1) {
            var samlRequest = QUERYSTRING.parse(request_post_data);
            samlResponse = samlRequest.SAMLResponse;
            // Log the response to the console if we are debugging
            console.log("");
            if (DEBUG === true) {
              console.log("SAMLResponse:");
              console.log(samlResponse);
            }
            // We found it. Return the samlResponse URIEncoded
            return resolve(encodeURI(samlResponse));
          }
          // Log the full response data (it is a lot) if that flag is set
          if (SHOWFULLRESPONSE === true) {
            console.log(result);
          }
          // Let the process continue
          request2.continue();
        }).catch(error => {
          // Catch errors and abort if needed
          console.error(error);
          request2.abort();
          if (request_url.indexOf('https://adminconsole.canvaslms.com/login?so') > -1) {
            return reject(error);
          }

        });
      });
      // await sleep(10000)
      // Now that the request intercepter is set up, actually go to the page. waitUntil: 'networkidle0' was in sample code
      // but switched to the default 'load'
      await page2.goto('https://adminconsole.canvaslms.com/s/', {
        waitUntil: 'load',
      });
      // Close the browser we opened
      await BROWSER.close();
    })
  };
// (async function main() {
//   // This is a unit test function. We pass in an username/password and check for the expect return
//   var username = 'support_admin';
//   var password = 'canvasrocks';
//   console.log("Testing... ");
//   var samlResponse = await getSAMLResponse(username, password);
//   if (samlResponse != "") {
//     console.log("Unit Test Successful. First 50 characters of SAMLResponse:" + samlResponse.substring(0,49));
//   } else {
//     console.log("Unit Test Unsuccessful. Nothing return. Check the console for a possible error.");
//   }
// })();
// Export function