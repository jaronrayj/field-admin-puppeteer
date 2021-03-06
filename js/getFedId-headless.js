const PUPPETEER = require('puppeteer'); // For browser automation
const DOTENV = require('dotenv');
const randomString = require('../util/randomString');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
module.exports =
async function getFedId(samlResponseArray) {
  return new Promise(async (resolve, reject) => {
    'use strict';
    // Requires
    // Used to store prod token in local env var
    // Declare vars
    await sleep(10000)
    let BROWSER; // The browser window we'll open/use
    const result = []; // The result arrays from the request intercepts. result is no longer used
    // result was used in function request intercept that is only being used for page2 now
    const result2 = []; // Leaving result there in case we need to debug the first page opening later
    const samlSFvalidate = "https://instructure.my.salesforce.com/setup/secur/SAMLValidationPage.apexp?ssoconfid=0LEA00000004CH2";
    // Debug/testing flags
    const DEBUG = false; // Write more info to the console
    // Load the dev env variables 
    // There's no need to check if .env exists, dotenv will check this for you. 
    // It will show a small warning which can be disabled when using this in production.
    DOTENV.config();
    const username = process.env.OKTA_USERNAME; // OKTA Username
    const password = process.env.OKTA_PASSWORD; // OKTA Password
    // This bypasses the SSL cert errors I was getting
    // Without this, I get 'RequestError: Error: unable to verify the first certificate'
    // We will get this error that can be igonred:
    // "node:39002) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification."
    // Possible fix https://stackoverflow.com/questions/31673587/error-unable-to-verify-the-first-certificate-in-nodejs/32440021#32440021
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    // Log the instance and credentials if debugging
    if (DEBUG == true) {
      console.log("username: " + username)
      console.log("saml site: " + samlSFvalidate);
    }
    // Launch the browser
    if (DEBUG == true) {
      BROWSER = await PUPPETEER.launch({
        headless: false
        // devtools: true
      }, ); // Full bowser (non-Headless)
    } else {
      BROWSER = await PUPPETEER.launch({
        headless: true
      }); // Headless 
    }
    // Open a new (blank) page and go to my sandbox. 
    // Originally was waitUntil: 'networkidle0' from example code but load is the default
    // You can ignore the error NODE_TLS_REJECT_UNAUTHORIZED - we are ignoring SSL to make the process work
    console.log("Logging into Okta and signing into SF to get Fed ID");
    // var page = await BROWSER.newPage();
    // await page.goto(samlInstance, {
    //   waitUntil: 'load',
    // });
    let page = await BROWSER.newPage();
    await page.goto(samlSFvalidate);

    await page.click('button.button.mb24.secondary.wide')
    await page.waitForNavigation(); // Wait for Navigation


    if (!username) {
      console.log(`Set up Okta credentials in a .env file`);
    }
    // Fill in username/pw then login to okta
    await page.waitForTimeout(2000);
    await page.type('input#okta-signin-username', username);
    await page.type('input#okta-signin-password', password);
    await page.click('input#okta-signin-submit');
    // await page.waitForNavigation(); // Wait for Navigation
    await page.waitForTimeout(3000);
    // Sending push notification, needs to be approved by phone
    await page.click('input.button.button-primary');
    console.log("Sign into okta with push notification, you have 10 min until process errors out");
    // set timeout to 10 min as that's the cap for push notification
    await page.setDefaultTimeout(600000)
    await page.waitForNavigation(); // Wait for Navigation
    console.log("Thanks for accepting push notification! Running fed ids.");
    // setting timeout back to 30 seconds
    await page.setDefaultTimeout(30000)
    await page.waitForTimeout(5000);

    for (let i = 0; i < samlResponseArray.length; i++) {
      const user = samlResponseArray[i];
      const userSaml = decodeURI(user.samlResponseEncoded).trim();

      // Only way I found to edit textarea field was to get all page content, remove it,
      // and type in saml response. That seems to be functioning though.
      let currentPage = await page.content();
      let splitpage = currentPage.split('name="thePage:block:theForm:Assertion" cols="100" rows="10">');
      let twiceSplit = splitpage[1].split('</textarea>');
      splitpage[1] = `name="thePage:block:theForm:Assertion" cols="100" rows="10"></textarea>${twiceSplit[1]}`;
      let putBack = splitpage.join("");
      await page.setContent(putBack)

      // Fill in the SAML Response section with the user SAML to get their FedID
      // This part takes forever to type out the SAML response, may be able to cut it back
      // By inputting it into form above and just typing a space into the field.
      await page.type("textarea[name='thePage:block:theForm:Assertion']", userSaml);
      await page.type("select[name='thePage:block:theForm:configId']", "Canvas Login");
      await page.click("input[name='thePage:block:theForm:Validate']");
      await page.waitForNavigation(); // Wait for Navigation

      currentPage = await page.content();
      splitpage = currentPage.split("Subject:&nbsp;")
      let secondSplit = splitpage[1].split("<br>")
      let fedId = secondSplit[0].trim();
      if (DEBUG === true) {
        console.log("getFedId -> fedId", fedId)
      }
      user.federatedId = fedId;
      console.log(`Got ${i + 1} Fed Id(s) out of ${samlResponseArray.length}.`);
    }
    console.log("Finished processing Federated IDs");
    console.log(`Setting up Federation ID for any clients that have sf_url`);
    for (let i = 0; i < samlResponseArray.length; i++) {
      const user = samlResponseArray[i];
      if (user.sf_url) {
        try {
          await page.goto(user.sf_url);
          await page.waitForNavigation(); // Wait for Navigation
          await page.waitForTimeout(3000);
          // running with clicking out of the widget window if it shows up
          try {
            await page.click("button[class='slds-button slds-button_icon slds-modal__close closeIcon slds-button_icon-bare slds-button_icon-inverse']")
            await page.waitForTimeout(2000);
          } catch (error) {
            if (DEBUG === true) {
              console.log(error);
            }
          }
          await page.click("button[class='slds-button slds-button_icon-border-filled']")
          await page.waitForTimeout(2000);
          await page.click("a[name='EnableCustomerPortal']")
          await page.waitForNavigation(); // Wait for Navigation
          let url = page.url();
          let urlsplit = url.split("CommunityNickname%3D");
          let joinedurl = urlsplit.join(`CommunityNickname%3D${randomString(3)}`)
          await page.goto(`${joinedurl}%26FederationIdentifier%3D${user.federatedId}`);
          await page.waitForNavigation(); // Wait for Navigation
          await page.waitForTimeout(5000);
          // await page.mouse.move(512,411)
          await page.mouse.click(512,367)
          await page.waitForNavigation(); // Wait for Navigation
          // await page.keyboard.press('Enter');
          console.log(`Set up ${user.email} as a field admin here ${user.sf_url}`);
        } catch (error) {
          if (DEBUG) {
            console.log(error);
          }
          console.log(`${user.email} was not set up successfully, please check here: ${user.sf_url}`);
        }
      } else {
        console.log(`sf_url not provided for ${user.email}`);
      }
    }
    await BROWSER.close();

    return resolve(samlResponseArray);
  })
};

// Test data
let sampleData = [
  // {
  //   "email": "example3@example.com",
  //   "domain": "jjohnson.instructure.com",
  //   "multipleAccounts": false,
  //   "account_admin": "FALSE",
  //   "sf_url": "",
  //   "unique_id": "fieldadminsetup_removeme4639",
  //   "id": 917323,
  //   "samlResponseEncoded": "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6%0D%0AdGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpu%0D%0AYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfZTFiZTQ1YjQtMWZh%0D%0AZS00ZTgzLWJlYzYtMTVlNmYzYzM0ZDc5IiBWZXJzaW9uPSIyLjAiIElzc3Vl%0D%0ASW5zdGFudD0iMjAyMC0xMi0xNVQxOTo1NDowNloiIERlc3RpbmF0aW9uPSJo%0D%0AdHRwczovL2FkbWluY29uc29sZS5jYW52YXNsbXMuY29tL2xvZ2luP3NvPTAw%0D%0AREEwMDAwMDAwSWJzayIgSW5SZXNwb25zZVRvPSJfMkNBQUFBWGI0S1pVNk1F%0D%0AOHdNa2N3TURBd01EQTBRemsyQUFBQTVQRTVyMjN2ZmMwYjBuTlQ4VTgydlhY%0D%0AQkdNNzBNcjRPR25YNlZNcGdaX203cThjVEs4dGZOUTYtQmxKVEdpWjFfbDRV%0D%0AeXRIWnZtaWpMazItX01CeFI1RkNkUnVNUFNvWXpqMEtMTklkeFFyX0J1Qzlj%0D%0AZ0xYZmFvWC1CaUFkSTI1TFFJQ1Q2MjM2bUJTQUJpTHo4MVZScTQ1TlgxclRs%0D%0AR2I3c05udDFDVkQxTm00U0FzS2VUbzg2WkFDOXNGSXR5ZVc2ZmprSXNkaHdP%0D%0AYmp6eGNOM2pqLUtQLVpzRHNnT2lsSy1WekxEVGtrSmZGaHVEc0tFN01mRjhK%0D%0ATC1McEZlV0NEZyI+PHNhbWw6SXNzdWVyPmh0dHBzOi8vc3NvLmNhbnZhc2xt%0D%0Acy5jb20vU0FNTDI8L3NhbWw6SXNzdWVyPjxzYW1scDpTdGF0dXM+PHNhbWxw%0D%0AOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIu%0D%0AMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbHA6U3RhdHVzPjxzYW1sOkFzc2Vy%0D%0AdGlvbiBJRD0iXzhiYjU1MTdhLWY4ZDItNDkzYy04ZmZhLTZmYzE3MDEwZmU0%0D%0AZSIgVmVyc2lvbj0iMi4wIiBJc3N1ZUluc3RhbnQ9IjIwMjAtMTItMTVUMTk6%0D%0ANTQ6MDZaIj48c2FtbDpJc3N1ZXI+aHR0cHM6Ly9zc28uY2FudmFzbG1zLmNv%0D%0AbS9TQU1MMjwvc2FtbDpJc3N1ZXI+PFNpZ25hdHVyZSB4bWxucz0iaHR0cDov%0D%0AL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+CjxTaWduZWRJbmZvPgo8%0D%0AQ2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cu%0D%0AdzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPgo8U2lnbmF0dXJlTWV0%0D%0AaG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxk%0D%0Ac2lnLW1vcmUjcnNhLXNoYTI1NiIvPgo8UmVmZXJlbmNlIFVSST0iI184YmI1%0D%0ANTE3YS1mOGQyLTQ5M2MtOGZmYS02ZmMxNzAxMGZlNGUiPgo8VHJhbnNmb3Jt%0D%0Acz4KPFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+CjxUcmFuc2Zv%0D%0Acm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1l%0D%0AeGMtYzE0biMiLz4KPC9UcmFuc2Zvcm1zPgo8RGlnZXN0TWV0aG9kIEFsZ29y%0D%0AaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2%0D%0AIi8+CjxEaWdlc3RWYWx1ZT5Dc3BXMTFDWlRHRTNHQ3BHZUVNcHBEanRkRzJO%0D%0AQ0RlSnRuczU5bHVZZUNNPTwvRGlnZXN0VmFsdWU+CjwvUmVmZXJlbmNlPgo8%0D%0AL1NpZ25lZEluZm8+CjxTaWduYXR1cmVWYWx1ZT5VNllnZEhaSDQxRG9BNG9O%0D%0AaVkxWVRTcUhMQzVaMFhJbmJtTUhPV29MR29obUI0bXVLLzBPeHNWU3lpWDJr%0D%0AUld5CkRDSDBFeTYvZ1ZLU1Vub2NTU0V4aS9RNlp1VVl3YWMzN2xSeE5mY2Z3%0D%0ATWFZbU9UWmJYOWtxbndEellqdEtHa3AKb08yS05OVVJyTXZDMVgxV1Q0VU9y%0D%0AaTFJMXV4RU9oTmNxRGlkdVdoTVVPQWJwUVNqV0thS0lGNDBScUpTVVNJLwpK%0D%0AZzBFUTJVNmFUVjdhY1IrcUN1UTdHM00wVU41aEtXMGF3QkVEL1YyN3hNTERM%0D%0ASWkxSDlqQWJtbDA5WEtvc3M0CnQybXhOZmplWTI4RXpaellzbG0reGQwWFRk%0D%0AWUFZWmRwVGROTDYwUEtQemx3WG40ajRtaGcrcDBoRmdXa0UzOFcKTHA2enpk%0D%0AVWF6NG5HYWpwWnRoaEtZQT09PC9TaWduYXR1cmVWYWx1ZT4KPEtleUluZm8+%0D%0ACjxYNTA5RGF0YT4KPFg1MDlDZXJ0aWZpY2F0ZT5NSUlFTURDQ0F4aWdBd0lC%0D%0AQWdJSkFQQlhnZXp0bjhVMk1BMEdDU3FHU0liM0RRRUJDd1VBTUlHc01Rc3dD%0D%0AUVlEClZRUUdFd0pWVXpFTk1Bc0dBMVVFQ0F3RVZYUmhhREVYTUJVR0ExVUVC%0D%0Ad3dPVTJGc2RDQk1ZV3RsSUVOcGRIa3gKR2pBWUJnTlZCQW9NRVVsdWMzUnlk%0D%0AV04wZFhKbExDQkpibU11TVJNd0VRWURWUVFMREFwUGNHVnlZWFJwYjI1egpN%0D%0AU0F3SGdZRFZRUUREQmREWVc1MllYTWdVMEZOVENCRFpYSjBhV1pwWTJGMFpU%0D%0ARWlNQ0FHQ1NxR1NJYjNEUUVKCkFSWVRiM0J6UUdsdWMzUnlkV04wZFhKbExt%0D%0ATnZiVEFlRncweE9UQXpNakV4TlRNNU1EUmFGdzB5T1RBek1UZ3gKTlRNNU1E%0D%0AUmFNSUdzTVFzd0NRWURWUVFHRXdKVlV6RU5NQXNHQTFVRUNBd0VWWFJoYURF%0D%0AWE1CVUdBMVVFQnd3TwpVMkZzZENCTVlXdGxJRU5wZEhreEdqQVlCZ05WQkFv%0D%0ATUVVbHVjM1J5ZFdOMGRYSmxMQ0JKYm1NdU1STXdFUVlEClZRUUxEQXBQY0dW%0D%0AeVlYUnBiMjV6TVNBd0hnWURWUVFEREJkRFlXNTJZWE1nVTBGTlRDQkRaWEow%0D%0AYVdacFkyRjAKWlRFaU1DQUdDU3FHU0liM0RRRUpBUllUYjNCelFHbHVjM1J5%0D%0AZFdOMGRYSmxMbU52YlRDQ0FTSXdEUVlKS29aSQpodmNOQVFFQkJRQURnZ0VQ%0D%0AQURDQ0FRb0NnZ0VCQVBYb1lDVzlRUHJ0Zm4wK1dMWDQzWXRNODlnTEhyblNN%0D%0AMHJSClRjKzBEUTlUVVpLS3JtYTgwWHZ3T1MzSzBoamY3ayttQWxhcllwdHdY%0D%0AdVBPYVM2K0xNUmd4QlJ4L2lXZHVnS3IKeVdLcHdieloxM3YxVG5MWjFyYzZU%0D%0AaHlSdWlsdktJUEQ3ZFAzcnYrQTFFellZazlaR3RkNWdGU0JVdFVxRndqMQo3%0D%0ANkNVYUVqQ0lOOEZhb2diYnBwV2kvQzFrV3RQdlBZK1VlWjRJQkpVcGorZWN0%0D%0AOHJiaGRWcTVGeERFclJkQXpICkNJaTZ4U3FsTHFtVjEzcnFENHNyTXRFOThk%0D%0AKzlLaTJoYXQzeU56M21tYjVhWmRpTFFrNkRvc2ZRbUhmTnk2SlMKR3lWd21B%0D%0AWk9QQjVzc0Z1TmZRWkZLOW82V0c1dW1TL2FFTi9zc2ZXLzd1TTlURGtrS3Zz%0D%0AQ0F3RUFBYU5UTUZFdwpIUVlEVlIwT0JCWUVGQXJhUTA0MTRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUI4R0ExVWRJd1FZTUJhQUZBcmFRMDQxCjRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNO%0D%0AQVFFTEJRQUQKZ2dFQkFBK0FhTS9kUExpZG9QTkpsS2o5elE5YVR2SklGN01R%0D%0AaGZyTmtlTmtNcEdtRTBpZ3laRnE2ejJXdUE1dQpVMmNGL2Y3ak5UQnFhYUZF%0D%0AYm5BOEJpUmxFL0ZyVExISUlnUDVKWDIrbjFXbWFrSS9hVmJuWElDdnJWUm44%0D%0ANFl0CjVTSGRWYWNJNVdodjNSS2dSemtwQk9iOWpnWitFNGtlQXZ0eEhVdUlN%0D%0ATUV0eFQvZnlTd0ZhUmZHMFdpdDZmeFgKYnVEaXVjTVdaK3ZFWTI0M2xPNk9S%0D%0AUFRpTWVNY1pHUnFBNXByd0FXeWZMemtYVzFYNVUzR1hoV1c3WlJtSHhrVAo4%0D%0ARXdwcFNlb3NpZ0puWUlqaHJYRnNpTFU3d3BsbkREOXlmZStobzcwWkczbWIy%0D%0ATWdmRzU5WkxUenYzbCtBbmF1CkJOK2Y2a3lZWjl6dGR2dWVYOFNVcDVUNHM0%0D%0AMD08L1g1MDlDZXJ0aWZpY2F0ZT4KPC9YNTA5RGF0YT4KPC9LZXlJbmZvPgo8%0D%0AL1NpZ25hdHVyZT48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRCBGb3JtYXQ9%0D%0AInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnBl%0D%0AcnNpc3RlbnQiPjcwY2Q2OWE4NzEyYmQ2YWJlYmQ0NDkwMDRiODdjOWY0OTI3%0D%0AODFkOGNiNjY1OTlhYWU2Njk2MTRhMDYyNjY1Mzg8L3NhbWw6TmFtZUlEPjxz%0D%0AYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFt%0D%0AZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmly%0D%0AbWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjAtMTItMTVUMTk6NTQ6MzZa%0D%0AIiBSZWNpcGllbnQ9Imh0dHBzOi8vYWRtaW5jb25zb2xlLmNhbnZhc2xtcy5j%0D%0Ab20vbG9naW4/c289MDBEQTAwMDAwMDBJYnNrIiBJblJlc3BvbnNlVG89Il8y%0D%0AQ0FBQUFYYjRLWlU2TUU4d01rY3dNREF3TURBMFF6azJBQUFBNVBFNXIyM3Zm%0D%0AYzBiMG5OVDhVODJ2WFhCR003ME1yNE9Hblg2Vk1wZ1pfbTdxOGNUSzh0Zk5R%0D%0ANi1CbEpUR2laMV9sNFV5dEhadm1pakxrMi1fTUJ4UjVGQ2RSdU1QU29Zemow%0D%0AS0xOSWR4UXJfQnVDOWNnTFhmYW9YLUJpQWRJMjVMUUlDVDYyMzZtQlNBQmlM%0D%0AejgxVlJxNDVOWDFyVGxHYjdzTm50MUNWRDFObTRTQXNLZVRvODZaQUM5c0ZJ%0D%0AdHllVzZmamtJc2Rod09ianp4Y04zamotS1AtWnNEc2dPaWxLLVZ6TERUa2tK%0D%0AZkZodURzS0U3TWZGOEpMLUxwRmVXQ0RnIi8+PC9zYW1sOlN1YmplY3RDb25m%0D%0AaXJtYXRpb24+PC9zYW1sOlN1YmplY3Q+PHNhbWw6Q29uZGl0aW9ucyBOb3RC%0D%0AZWZvcmU9IjIwMjAtMTItMTVUMTk6NTQ6MDFaIiBOb3RPbk9yQWZ0ZXI9IjIw%0D%0AMjAtMTItMTVUMTk6NTQ6MzZaIj48c2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9u%0D%0APjxzYW1sOkF1ZGllbmNlPmh0dHBzOi8vc2FtbC5zYWxlc2ZvcmNlLmNvbTwv%0D%0Ac2FtbDpBdWRpZW5jZT48L3NhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48L3Nh%0D%0AbWw6Q29uZGl0aW9ucz48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRobkluc3Rh%0D%0AbnQ9IjIwMjAtMTItMTVUMTk6NTQ6MDZaIj48c2FtbDpBdXRobkNvbnRleHQ+%0D%0APHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRj%0D%0AOlNBTUw6Mi4wOmFjOmNsYXNzZXM6dW5zcGVjaWZpZWQ8L3NhbWw6QXV0aG5D%0D%0Ab250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0%0D%0AaG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50IHhtbG5zOnhz%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNp%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuRmVkZXJhdGVkSWRlbnRpZmll%0D%0AciI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmluZyI+%0D%0ANzBjZDY5YTg3MTJiZDZhYmViZDQ0OTAwNGI4N2M5ZjQ5Mjc4MWQ4Y2I2NjU5%0D%0AOWFhZTY2OTYxNGEwNjI2NjUzODwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3Nh%0D%0AbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkZpcnN0%0D%0ATmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmlu%0D%0AZyI+ZXhhbXBsZTNAZXhhbXBsZS5jb208L3NhbWw6QXR0cmlidXRlVmFsdWU+%0D%0APC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iVXNlci5M%0D%0AYXN0TmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0%0D%0AcmluZyIvPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9%0D%0AIlVzZXIuQWxpYXMiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4%0D%0AczpzdHJpbmciPmV4YW1wbGUzQGV4YW1wbGUuY29tPC9zYW1sOkF0dHJpYnV0%0D%0AZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9%0D%0AIlVzZXIuRW1haWwiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4%0D%0AczpzdHJpbmciPmV4YW1wbGUzQGV4YW1wbGUuY29tPC9zYW1sOkF0dHJpYnV0%0D%0AZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9%0D%0AIlVzZXIuVXNlcm5hbWUiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhzaTp0eXBl%0D%0APSJ4czpzdHJpbmciPmZpZWxkYWRtaW5zZXR1cF9yZW1vdmVtZTQ2Mzk8L3Nh%0D%0AbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRy%0D%0AaWJ1dGUgTmFtZT0iVXNlci5Mb2NhbGVTaWRLZXkiLz48c2FtbDpBdHRyaWJ1%0D%0AdGUgTmFtZT0iQ2FudmFzLlVzZXJJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWUg%0D%0AeHNpOnR5cGU9InhzOnN0cmluZyI+ZmllbGRhZG1pbnNldHVwX3JlbW92ZW1l%0D%0ANDYzOTwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6QXR0cmlidXRlPjxz%0D%0AYW1sOkF0dHJpYnV0ZSBOYW1lPSJDYW52YXMuUm9vdEFjY291bnRJRCI+PHNh%0D%0AbWw6QXR0cmlidXRlVmFsdWU+OTc1ODAwMDAwMDAwMDAwMDk8L3NhbWw6QXR0%0D%0AcmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUg%0D%0ATmFtZT0iQ2FudmFzLlJvb3RBY2NvdW50VVJMIj48c2FtbDpBdHRyaWJ1dGVW%0D%0AYWx1ZSB4c2k6dHlwZT0ieHM6c3RyaW5nIj5qam9obnNvbi5pbnN0cnVjdHVy%0D%0AZS5jb208L3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48%0D%0AL3NhbWw6QXR0cmlidXRlU3RhdGVtZW50Pjwvc2FtbDpBc3NlcnRpb24+PC9z%0D%0AYW1scDpSZXNwb25zZT4K%0D%0A",
  //   "federatedId": "70cd69a8712bd6abebd449004b87c9f492781d8cb66599aae669614a06266538"
  // },
  // {
  //   "email": "example@example.com",
  //   "domain": "jjohnson.instructure.com",
  //   "multipleAccounts": false,
  //   "account_admin": "False",
  //   "sf_url": "",
  //   "unique_id": "fieldadminsetup_removeme1404",
  //   "id": 917414,
  //   "samlResponseEncoded": "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6%0D%0AdGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpu%0D%0AYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfMzEwMDAxNTItN2I3%0D%0AMC00MDM2LWEwNWQtNGQ2MDk1MGE2YjNkIiBWZXJzaW9uPSIyLjAiIElzc3Vl%0D%0ASW5zdGFudD0iMjAyMC0xMi0xNVQxOTo1NDoyNloiIERlc3RpbmF0aW9uPSJo%0D%0AdHRwczovL2FkbWluY29uc29sZS5jYW52YXNsbXMuY29tL2xvZ2luP3NvPTAw%0D%0AREEwMDAwMDAwSWJzayIgSW5SZXNwb25zZVRvPSJfMkNBQUFBWGI0S2VJOE1F%0D%0AOHdNa2N3TURBd01EQTBRemsyQUFBQTVCTE1OOEVSMXRNakVSOFd1Y0ZieFNH%0D%0ARk9PVDd0VUY3cmtOdTNHX2plLV9OVlo5bHZDQXkycWZhSDYxa0lBOFktcFZB%0D%0AT2FoWlphTE5uYzJEUFRBbWJTaWNwb0pHM2RjVjFqajNXNTFWcXRjWXBVd0FX%0D%0ARjV4M25LVVlRQV9LVHZpVGdZMjBVLV9EbVFvUzA2X0lIcGVSNHNuUVdYV1BW%0D%0AbE5JRHYzWXl5OHFXNHdnOXhtbm1SaS1VZm1LeWdUVGVrbHRNMDU4SUpIVkYy%0D%0AMzVZNnQzTmhlbE02c1NpQS00Y1Q2b3I1WThXUHdBOHRmdnM2SXhhMEJzalRQ%0D%0AT2NBS0JUQ0hfdyI+PHNhbWw6SXNzdWVyPmh0dHBzOi8vc3NvLmNhbnZhc2xt%0D%0Acy5jb20vU0FNTDI8L3NhbWw6SXNzdWVyPjxzYW1scDpTdGF0dXM+PHNhbWxw%0D%0AOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIu%0D%0AMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbHA6U3RhdHVzPjxzYW1sOkFzc2Vy%0D%0AdGlvbiBJRD0iX2MzMjdiM2M0LTk3NzgtNDY1Ny05Y2QyLTBkZjdkNzVlNjIy%0D%0AZiIgVmVyc2lvbj0iMi4wIiBJc3N1ZUluc3RhbnQ9IjIwMjAtMTItMTVUMTk6%0D%0ANTQ6MjZaIj48c2FtbDpJc3N1ZXI+aHR0cHM6Ly9zc28uY2FudmFzbG1zLmNv%0D%0AbS9TQU1MMjwvc2FtbDpJc3N1ZXI+PFNpZ25hdHVyZSB4bWxucz0iaHR0cDov%0D%0AL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+CjxTaWduZWRJbmZvPgo8%0D%0AQ2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cu%0D%0AdzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPgo8U2lnbmF0dXJlTWV0%0D%0AaG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxk%0D%0Ac2lnLW1vcmUjcnNhLXNoYTI1NiIvPgo8UmVmZXJlbmNlIFVSST0iI19jMzI3%0D%0AYjNjNC05Nzc4LTQ2NTctOWNkMi0wZGY3ZDc1ZTYyMmYiPgo8VHJhbnNmb3Jt%0D%0Acz4KPFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+CjxUcmFuc2Zv%0D%0Acm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1l%0D%0AeGMtYzE0biMiLz4KPC9UcmFuc2Zvcm1zPgo8RGlnZXN0TWV0aG9kIEFsZ29y%0D%0AaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2%0D%0AIi8+CjxEaWdlc3RWYWx1ZT5jMkZESGE2dEtxMjhzQjI3VGZLemVISzJSOUN1%0D%0AVTFCZ2tkdlJJbER6dm1FPTwvRGlnZXN0VmFsdWU+CjwvUmVmZXJlbmNlPgo8%0D%0AL1NpZ25lZEluZm8+CjxTaWduYXR1cmVWYWx1ZT55aDdPZmE4cGV1ZmVkMHh5%0D%0AZE1uTzQ5bnRjMVRDVE9LcnBIeldwaDY1UVJjV3NIdEd2dGF0enBaRm5LYitB%0D%0AUG9CCml4RzdpN1l0VzREL1p6VDF6ZGtIdUI1eTgwazE3NndnQ0lZejVOMVhP%0D%0AcWtBZHFhNWU3YkpBTktITXlsZ25qVWwKSkM0NXlyQ3ljRERIeTErdkIxeG9B%0D%0AMmZ4R1dOYXIyQ1ZQUExyOWVmMERoa3dPb2k0KzRHejFmc0U0cUJTU0lyMwpU%0D%0Ac3RNN29MaGl3ZmRyNm0rVFFUUm0yd3RiWENneUtQT2pEMlVyUkFSUVhnbm5D%0D%0AZ3FqaEVNekhxRlZiNkg2OGtaClJ1Z0VNMGNDNzA5UVdQb2JFOWs1NW0xU29B%0D%0AZGxyUXhvRnlyRHE0TWs3V2dzY2hHQk81enFhbXRZM0Vhblp6WVYKUy9oaE5O%0D%0AQllERmQyOGRwRUQ3a3lodz09PC9TaWduYXR1cmVWYWx1ZT4KPEtleUluZm8+%0D%0ACjxYNTA5RGF0YT4KPFg1MDlDZXJ0aWZpY2F0ZT5NSUlFTURDQ0F4aWdBd0lC%0D%0AQWdJSkFQQlhnZXp0bjhVMk1BMEdDU3FHU0liM0RRRUJDd1VBTUlHc01Rc3dD%0D%0AUVlEClZRUUdFd0pWVXpFTk1Bc0dBMVVFQ0F3RVZYUmhhREVYTUJVR0ExVUVC%0D%0Ad3dPVTJGc2RDQk1ZV3RsSUVOcGRIa3gKR2pBWUJnTlZCQW9NRVVsdWMzUnlk%0D%0AV04wZFhKbExDQkpibU11TVJNd0VRWURWUVFMREFwUGNHVnlZWFJwYjI1egpN%0D%0AU0F3SGdZRFZRUUREQmREWVc1MllYTWdVMEZOVENCRFpYSjBhV1pwWTJGMFpU%0D%0ARWlNQ0FHQ1NxR1NJYjNEUUVKCkFSWVRiM0J6UUdsdWMzUnlkV04wZFhKbExt%0D%0ATnZiVEFlRncweE9UQXpNakV4TlRNNU1EUmFGdzB5T1RBek1UZ3gKTlRNNU1E%0D%0AUmFNSUdzTVFzd0NRWURWUVFHRXdKVlV6RU5NQXNHQTFVRUNBd0VWWFJoYURF%0D%0AWE1CVUdBMVVFQnd3TwpVMkZzZENCTVlXdGxJRU5wZEhreEdqQVlCZ05WQkFv%0D%0ATUVVbHVjM1J5ZFdOMGRYSmxMQ0JKYm1NdU1STXdFUVlEClZRUUxEQXBQY0dW%0D%0AeVlYUnBiMjV6TVNBd0hnWURWUVFEREJkRFlXNTJZWE1nVTBGTlRDQkRaWEow%0D%0AYVdacFkyRjAKWlRFaU1DQUdDU3FHU0liM0RRRUpBUllUYjNCelFHbHVjM1J5%0D%0AZFdOMGRYSmxMbU52YlRDQ0FTSXdEUVlKS29aSQpodmNOQVFFQkJRQURnZ0VQ%0D%0AQURDQ0FRb0NnZ0VCQVBYb1lDVzlRUHJ0Zm4wK1dMWDQzWXRNODlnTEhyblNN%0D%0AMHJSClRjKzBEUTlUVVpLS3JtYTgwWHZ3T1MzSzBoamY3ayttQWxhcllwdHdY%0D%0AdVBPYVM2K0xNUmd4QlJ4L2lXZHVnS3IKeVdLcHdieloxM3YxVG5MWjFyYzZU%0D%0AaHlSdWlsdktJUEQ3ZFAzcnYrQTFFellZazlaR3RkNWdGU0JVdFVxRndqMQo3%0D%0ANkNVYUVqQ0lOOEZhb2diYnBwV2kvQzFrV3RQdlBZK1VlWjRJQkpVcGorZWN0%0D%0AOHJiaGRWcTVGeERFclJkQXpICkNJaTZ4U3FsTHFtVjEzcnFENHNyTXRFOThk%0D%0AKzlLaTJoYXQzeU56M21tYjVhWmRpTFFrNkRvc2ZRbUhmTnk2SlMKR3lWd21B%0D%0AWk9QQjVzc0Z1TmZRWkZLOW82V0c1dW1TL2FFTi9zc2ZXLzd1TTlURGtrS3Zz%0D%0AQ0F3RUFBYU5UTUZFdwpIUVlEVlIwT0JCWUVGQXJhUTA0MTRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUI4R0ExVWRJd1FZTUJhQUZBcmFRMDQxCjRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNO%0D%0AQVFFTEJRQUQKZ2dFQkFBK0FhTS9kUExpZG9QTkpsS2o5elE5YVR2SklGN01R%0D%0AaGZyTmtlTmtNcEdtRTBpZ3laRnE2ejJXdUE1dQpVMmNGL2Y3ak5UQnFhYUZF%0D%0AYm5BOEJpUmxFL0ZyVExISUlnUDVKWDIrbjFXbWFrSS9hVmJuWElDdnJWUm44%0D%0ANFl0CjVTSGRWYWNJNVdodjNSS2dSemtwQk9iOWpnWitFNGtlQXZ0eEhVdUlN%0D%0ATUV0eFQvZnlTd0ZhUmZHMFdpdDZmeFgKYnVEaXVjTVdaK3ZFWTI0M2xPNk9S%0D%0AUFRpTWVNY1pHUnFBNXByd0FXeWZMemtYVzFYNVUzR1hoV1c3WlJtSHhrVAo4%0D%0ARXdwcFNlb3NpZ0puWUlqaHJYRnNpTFU3d3BsbkREOXlmZStobzcwWkczbWIy%0D%0ATWdmRzU5WkxUenYzbCtBbmF1CkJOK2Y2a3lZWjl6dGR2dWVYOFNVcDVUNHM0%0D%0AMD08L1g1MDlDZXJ0aWZpY2F0ZT4KPC9YNTA5RGF0YT4KPC9LZXlJbmZvPgo8%0D%0AL1NpZ25hdHVyZT48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRCBGb3JtYXQ9%0D%0AInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnBl%0D%0AcnNpc3RlbnQiPjhiNDI5OGY3ZjdkOWJlY2I2MmVmN2M3YzAzN2FhZWI1MGFi%0D%0AMWNhYTY0NWI4ZmRmMzQ2YWE1YmE5NWE3YzRkNjA8L3NhbWw6TmFtZUlEPjxz%0D%0AYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFt%0D%0AZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmly%0D%0AbWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjAtMTItMTVUMTk6NTQ6NTZa%0D%0AIiBSZWNpcGllbnQ9Imh0dHBzOi8vYWRtaW5jb25zb2xlLmNhbnZhc2xtcy5j%0D%0Ab20vbG9naW4/c289MDBEQTAwMDAwMDBJYnNrIiBJblJlc3BvbnNlVG89Il8y%0D%0AQ0FBQUFYYjRLZUk4TUU4d01rY3dNREF3TURBMFF6azJBQUFBNUJMTU44RVIx%0D%0AdE1qRVI4V3VjRmJ4U0dGT09UN3RVRjdya051M0dfamUtX05WWjlsdkNBeTJx%0D%0AZmFINjFrSUE4WS1wVkFPYWhaWmFMTm5jMkRQVEFtYlNpY3BvSkczZGNWMWpq%0D%0AM1c1MVZxdGNZcFV3QVdGNXgzbktVWVFBX0tUdmlUZ1kyMFUtX0RtUW9TMDZf%0D%0ASUhwZVI0c25RV1hXUFZsTklEdjNZeXk4cVc0d2c5eG1ubVJpLVVmbUt5Z1RU%0D%0AZWtsdE0wNThJSkhWRjIzNVk2dDNOaGVsTTZzU2lBLTRjVDZvcjVZOFdQd0E4%0D%0AdGZ2czZJeGEwQnNqVFBPY0FLQlRDSF93Ii8+PC9zYW1sOlN1YmplY3RDb25m%0D%0AaXJtYXRpb24+PC9zYW1sOlN1YmplY3Q+PHNhbWw6Q29uZGl0aW9ucyBOb3RC%0D%0AZWZvcmU9IjIwMjAtMTItMTVUMTk6NTQ6MjFaIiBOb3RPbk9yQWZ0ZXI9IjIw%0D%0AMjAtMTItMTVUMTk6NTQ6NTZaIj48c2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9u%0D%0APjxzYW1sOkF1ZGllbmNlPmh0dHBzOi8vc2FtbC5zYWxlc2ZvcmNlLmNvbTwv%0D%0Ac2FtbDpBdWRpZW5jZT48L3NhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48L3Nh%0D%0AbWw6Q29uZGl0aW9ucz48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRobkluc3Rh%0D%0AbnQ9IjIwMjAtMTItMTVUMTk6NTQ6MjZaIj48c2FtbDpBdXRobkNvbnRleHQ+%0D%0APHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRj%0D%0AOlNBTUw6Mi4wOmFjOmNsYXNzZXM6dW5zcGVjaWZpZWQ8L3NhbWw6QXV0aG5D%0D%0Ab250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0%0D%0AaG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50IHhtbG5zOnhz%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNp%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuRmVkZXJhdGVkSWRlbnRpZmll%0D%0AciI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmluZyI+%0D%0AOGI0Mjk4ZjdmN2Q5YmVjYjYyZWY3YzdjMDM3YWFlYjUwYWIxY2FhNjQ1Yjhm%0D%0AZGYzNDZhYTViYTk1YTdjNGQ2MDwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3Nh%0D%0AbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkZpcnN0%0D%0ATmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmlu%0D%0AZyI+VHJ5PC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuTGFzdE5hbWUiPjxzYW1sOkF0%0D%0AdHJpYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPlRoaXM8L3NhbWw6%0D%0AQXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1%0D%0AdGUgTmFtZT0iVXNlci5BbGlhcyI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNp%0D%0AOnR5cGU9InhzOnN0cmluZyI+VHJ5IFRoaXM8L3NhbWw6QXR0cmlidXRlVmFs%0D%0AdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iVXNl%0D%0Aci5FbWFpbCI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0%0D%0AcmluZyI+ZXhhbXBsZUBleGFtcGxlLmNvbTwvc2FtbDpBdHRyaWJ1dGVWYWx1%0D%0AZT48L3NhbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2Vy%0D%0ALlVzZXJuYW1lIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6%0D%0Ac3RyaW5nIj5maWVsZGFkbWluc2V0dXBfcmVtb3ZlbWUxNDA0PC9zYW1sOkF0%0D%0AdHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRl%0D%0AIE5hbWU9IlVzZXIuTG9jYWxlU2lkS2V5Ii8+PHNhbWw6QXR0cmlidXRlIE5h%0D%0AbWU9IkNhbnZhcy5Vc2VySUQiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhzaTp0%0D%0AeXBlPSJ4czpzdHJpbmciPmZpZWxkYWRtaW5zZXR1cF9yZW1vdmVtZTE0MDQ8%0D%0AL3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpB%0D%0AdHRyaWJ1dGUgTmFtZT0iQ2FudmFzLlJvb3RBY2NvdW50SUQiPjxzYW1sOkF0%0D%0AdHJpYnV0ZVZhbHVlPjk3NTgwMDAwMDAwMDAwMDA5PC9zYW1sOkF0dHJpYnV0%0D%0AZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9%0D%0AIkNhbnZhcy5Sb290QWNjb3VudFVSTCI+PHNhbWw6QXR0cmlidXRlVmFsdWUg%0D%0AeHNpOnR5cGU9InhzOnN0cmluZyI+ampvaG5zb24uaW5zdHJ1Y3R1cmUuY29t%0D%0APC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PC9zYW1s%0D%0AOkF0dHJpYnV0ZVN0YXRlbWVudD48L3NhbWw6QXNzZXJ0aW9uPjwvc2FtbHA6%0D%0AUmVzcG9uc2U+Cg==%0D%0A",
  //   "federatedId": "8b4298f7f7d9becb62ef7c7c037aaeb50ab1caa645b8fdf346aa5ba95a7c4d60"
  // },
  {
    "email": "test@example.com",
    "domain": "jjohnson.instructure.com",
    "multipleAccounts": false,
    "account_admin": "TRUE",
    "sf_url": "https://instructure.lightning.force.com/lightning/r/Contact/0032G00002VCpCNQA1/view",
    "unique_id": "fieldadminsetup_removeme3783",
    "id": 917760,
    "samlResponseEncoded": "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6%0D%0AdGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpu%0D%0AYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfOWE5ZGU0NmQtMTk1%0D%0ANC00OGI0LThjNDYtYTBjNWU4NjM2ODU5IiBWZXJzaW9uPSIyLjAiIElzc3Vl%0D%0ASW5zdGFudD0iMjAyMC0xMi0xNVQxOTo1NDo0NVoiIERlc3RpbmF0aW9uPSJo%0D%0AdHRwczovL2FkbWluY29uc29sZS5jYW52YXNsbXMuY29tL2xvZ2luP3NvPTAw%0D%0AREEwMDAwMDAwSWJzayIgSW5SZXNwb25zZVRvPSJfMkNBQUFBWGI0S2pGZ01F%0D%0AOHdNa2N3TURBd01EQTBRemsyQUFBQTVEZEozb0h0RXRod3kzdzdYLWdIQURE%0D%0AbV92YTJvWHJ6a0FRTDBLdHBId21OVW1WcjA5aUF6SmdBWG81RlY0MElsajdf%0D%0Acm5fOW9pMnNvQXdkSEYtZVFIMkp2N1REeUVpQkdaMFkzNXNYRzhMYUkxR0NQ%0D%0AVDN1YlhNTWtubVh0NC03Y3JWMmV5SlJ2SVR5NmJJeF9iVEdqeDZOclJPU2RW%0D%0AazJ5NmxHOW9UX0lCc3QxRi1nOW1XZVJVcTNzTXJhZ2kyRHhNLWd3SXVhdE5D%0D%0AUFFJeTVad0k5cXRGVDh2M1ZpcnlsTmNpbzFCWUhGaFJnNXNPUkNER0oybnVY%0D%0ARl9McThsUkdXUSI+PHNhbWw6SXNzdWVyPmh0dHBzOi8vc3NvLmNhbnZhc2xt%0D%0Acy5jb20vU0FNTDI8L3NhbWw6SXNzdWVyPjxzYW1scDpTdGF0dXM+PHNhbWxw%0D%0AOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIu%0D%0AMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbHA6U3RhdHVzPjxzYW1sOkFzc2Vy%0D%0AdGlvbiBJRD0iXzRjNjM3YzM1LTRhY2ItNDQ0Yy04OGEwLWZkZmU1MTlkZmY4%0D%0AYSIgVmVyc2lvbj0iMi4wIiBJc3N1ZUluc3RhbnQ9IjIwMjAtMTItMTVUMTk6%0D%0ANTQ6NDVaIj48c2FtbDpJc3N1ZXI+aHR0cHM6Ly9zc28uY2FudmFzbG1zLmNv%0D%0AbS9TQU1MMjwvc2FtbDpJc3N1ZXI+PFNpZ25hdHVyZSB4bWxucz0iaHR0cDov%0D%0AL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+CjxTaWduZWRJbmZvPgo8%0D%0AQ2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cu%0D%0AdzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPgo8U2lnbmF0dXJlTWV0%0D%0AaG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxk%0D%0Ac2lnLW1vcmUjcnNhLXNoYTI1NiIvPgo8UmVmZXJlbmNlIFVSST0iI180YzYz%0D%0AN2MzNS00YWNiLTQ0NGMtODhhMC1mZGZlNTE5ZGZmOGEiPgo8VHJhbnNmb3Jt%0D%0Acz4KPFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+CjxUcmFuc2Zv%0D%0Acm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1l%0D%0AeGMtYzE0biMiLz4KPC9UcmFuc2Zvcm1zPgo8RGlnZXN0TWV0aG9kIEFsZ29y%0D%0AaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2%0D%0AIi8+CjxEaWdlc3RWYWx1ZT52enhya2J1TXFJbnREcUp3U1k4cnlUSVlMR1Zh%0D%0AazBxUFhnTDl3Z1p4OVRBPTwvRGlnZXN0VmFsdWU+CjwvUmVmZXJlbmNlPgo8%0D%0AL1NpZ25lZEluZm8+CjxTaWduYXR1cmVWYWx1ZT5aLytyQTZvQWxqQm9ZTWV4%0D%0Ac0F5ZndSU3FTaGtLMEtrT1ZQSE1DR2lWcjQwemJ5QmhDUlJoOXZBQUt2UHZW%0D%0AUEY5CktFUmxScFNqNmFWOWQvQm5Rd0lVUzhQN2l2K29LbVI1ck5saXF4cDBT%0D%0ATkFTTy9KTGppNW04WWEzOGlKbnU4YXMKY1IraCtWemplYlJ6NU5RMnNYZ3dV%0D%0ASTcxcnFqaU1MS28vaGRzeXBncWt3enRucE5QWXZTVzJ5S1J2Q0JBZnR4WQpu%0D%0ASGprZ0FKY3ZQVTZ2YjNXWHZCOWJrMFJxMHBNa2k4Yis4MTZOMlo1YUdqRDQ2%0D%0AY2p1eVZUVVpFT1BOTzZBck9kCk1vbk5QcG5sUE9ma2hYQUJtanlFM0YraHE2%0D%0ARUZBYTN3UEZpZWoxQ29hd3hrR1hXblVGckM4TXp6R3pUZkxRY1kKUUIvSytw%0D%0AaHpXK0pPY3puNmdtNFpGdz09PC9TaWduYXR1cmVWYWx1ZT4KPEtleUluZm8+%0D%0ACjxYNTA5RGF0YT4KPFg1MDlDZXJ0aWZpY2F0ZT5NSUlFTURDQ0F4aWdBd0lC%0D%0AQWdJSkFQQlhnZXp0bjhVMk1BMEdDU3FHU0liM0RRRUJDd1VBTUlHc01Rc3dD%0D%0AUVlEClZRUUdFd0pWVXpFTk1Bc0dBMVVFQ0F3RVZYUmhhREVYTUJVR0ExVUVC%0D%0Ad3dPVTJGc2RDQk1ZV3RsSUVOcGRIa3gKR2pBWUJnTlZCQW9NRVVsdWMzUnlk%0D%0AV04wZFhKbExDQkpibU11TVJNd0VRWURWUVFMREFwUGNHVnlZWFJwYjI1egpN%0D%0AU0F3SGdZRFZRUUREQmREWVc1MllYTWdVMEZOVENCRFpYSjBhV1pwWTJGMFpU%0D%0ARWlNQ0FHQ1NxR1NJYjNEUUVKCkFSWVRiM0J6UUdsdWMzUnlkV04wZFhKbExt%0D%0ATnZiVEFlRncweE9UQXpNakV4TlRNNU1EUmFGdzB5T1RBek1UZ3gKTlRNNU1E%0D%0AUmFNSUdzTVFzd0NRWURWUVFHRXdKVlV6RU5NQXNHQTFVRUNBd0VWWFJoYURF%0D%0AWE1CVUdBMVVFQnd3TwpVMkZzZENCTVlXdGxJRU5wZEhreEdqQVlCZ05WQkFv%0D%0ATUVVbHVjM1J5ZFdOMGRYSmxMQ0JKYm1NdU1STXdFUVlEClZRUUxEQXBQY0dW%0D%0AeVlYUnBiMjV6TVNBd0hnWURWUVFEREJkRFlXNTJZWE1nVTBGTlRDQkRaWEow%0D%0AYVdacFkyRjAKWlRFaU1DQUdDU3FHU0liM0RRRUpBUllUYjNCelFHbHVjM1J5%0D%0AZFdOMGRYSmxMbU52YlRDQ0FTSXdEUVlKS29aSQpodmNOQVFFQkJRQURnZ0VQ%0D%0AQURDQ0FRb0NnZ0VCQVBYb1lDVzlRUHJ0Zm4wK1dMWDQzWXRNODlnTEhyblNN%0D%0AMHJSClRjKzBEUTlUVVpLS3JtYTgwWHZ3T1MzSzBoamY3ayttQWxhcllwdHdY%0D%0AdVBPYVM2K0xNUmd4QlJ4L2lXZHVnS3IKeVdLcHdieloxM3YxVG5MWjFyYzZU%0D%0AaHlSdWlsdktJUEQ3ZFAzcnYrQTFFellZazlaR3RkNWdGU0JVdFVxRndqMQo3%0D%0ANkNVYUVqQ0lOOEZhb2diYnBwV2kvQzFrV3RQdlBZK1VlWjRJQkpVcGorZWN0%0D%0AOHJiaGRWcTVGeERFclJkQXpICkNJaTZ4U3FsTHFtVjEzcnFENHNyTXRFOThk%0D%0AKzlLaTJoYXQzeU56M21tYjVhWmRpTFFrNkRvc2ZRbUhmTnk2SlMKR3lWd21B%0D%0AWk9QQjVzc0Z1TmZRWkZLOW82V0c1dW1TL2FFTi9zc2ZXLzd1TTlURGtrS3Zz%0D%0AQ0F3RUFBYU5UTUZFdwpIUVlEVlIwT0JCWUVGQXJhUTA0MTRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUI4R0ExVWRJd1FZTUJhQUZBcmFRMDQxCjRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNO%0D%0AQVFFTEJRQUQKZ2dFQkFBK0FhTS9kUExpZG9QTkpsS2o5elE5YVR2SklGN01R%0D%0AaGZyTmtlTmtNcEdtRTBpZ3laRnE2ejJXdUE1dQpVMmNGL2Y3ak5UQnFhYUZF%0D%0AYm5BOEJpUmxFL0ZyVExISUlnUDVKWDIrbjFXbWFrSS9hVmJuWElDdnJWUm44%0D%0ANFl0CjVTSGRWYWNJNVdodjNSS2dSemtwQk9iOWpnWitFNGtlQXZ0eEhVdUlN%0D%0ATUV0eFQvZnlTd0ZhUmZHMFdpdDZmeFgKYnVEaXVjTVdaK3ZFWTI0M2xPNk9S%0D%0AUFRpTWVNY1pHUnFBNXByd0FXeWZMemtYVzFYNVUzR1hoV1c3WlJtSHhrVAo4%0D%0ARXdwcFNlb3NpZ0puWUlqaHJYRnNpTFU3d3BsbkREOXlmZStobzcwWkczbWIy%0D%0ATWdmRzU5WkxUenYzbCtBbmF1CkJOK2Y2a3lZWjl6dGR2dWVYOFNVcDVUNHM0%0D%0AMD08L1g1MDlDZXJ0aWZpY2F0ZT4KPC9YNTA5RGF0YT4KPC9LZXlJbmZvPgo8%0D%0AL1NpZ25hdHVyZT48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRCBGb3JtYXQ9%0D%0AInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnBl%0D%0AcnNpc3RlbnQiPjAyYjJiYmQzZmEzYmEyMDliZjgwMTdkNzg3MmIzOTE1MjNm%0D%0ANjIyOGY1NzZkNTZkNWY3ZWRkZjA0ODFmYzkwMDY8L3NhbWw6TmFtZUlEPjxz%0D%0AYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFt%0D%0AZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmly%0D%0AbWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjAtMTItMTVUMTk6NTU6MTVa%0D%0AIiBSZWNpcGllbnQ9Imh0dHBzOi8vYWRtaW5jb25zb2xlLmNhbnZhc2xtcy5j%0D%0Ab20vbG9naW4/c289MDBEQTAwMDAwMDBJYnNrIiBJblJlc3BvbnNlVG89Il8y%0D%0AQ0FBQUFYYjRLakZnTUU4d01rY3dNREF3TURBMFF6azJBQUFBNURkSjNvSHRF%0D%0AdGh3eTN3N1gtZ0hBRERtX3ZhMm9YcnprQVFMMEt0cEh3bU5VbVZyMDlpQXpK%0D%0AZ0FYbzVGVjQwSWxqN19ybl85b2kyc29Bd2RIRi1lUUgySnY3VER5RWlCR1ow%0D%0AWTM1c1hHOExhSTFHQ1BUM3ViWE1Na25tWHQ0LTdjclYyZXlKUnZJVHk2Ykl4%0D%0AX2JUR2p4Nk5yUk9TZFZrMnk2bEc5b1RfSUJzdDFGLWc5bVdlUlVxM3NNcmFn%0D%0AaTJEeE0tZ3dJdWF0TkNQUUl5NVp3STlxdEZUOHYzVmlyeWxOY2lvMUJZSEZo%0D%0AUmc1c09SQ0RHSjJudVhGX0xxOGxSR1dRIi8+PC9zYW1sOlN1YmplY3RDb25m%0D%0AaXJtYXRpb24+PC9zYW1sOlN1YmplY3Q+PHNhbWw6Q29uZGl0aW9ucyBOb3RC%0D%0AZWZvcmU9IjIwMjAtMTItMTVUMTk6NTQ6NDBaIiBOb3RPbk9yQWZ0ZXI9IjIw%0D%0AMjAtMTItMTVUMTk6NTU6MTVaIj48c2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9u%0D%0APjxzYW1sOkF1ZGllbmNlPmh0dHBzOi8vc2FtbC5zYWxlc2ZvcmNlLmNvbTwv%0D%0Ac2FtbDpBdWRpZW5jZT48L3NhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48L3Nh%0D%0AbWw6Q29uZGl0aW9ucz48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRobkluc3Rh%0D%0AbnQ9IjIwMjAtMTItMTVUMTk6NTQ6NDVaIj48c2FtbDpBdXRobkNvbnRleHQ+%0D%0APHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRj%0D%0AOlNBTUw6Mi4wOmFjOmNsYXNzZXM6dW5zcGVjaWZpZWQ8L3NhbWw6QXV0aG5D%0D%0Ab250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0%0D%0AaG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50IHhtbG5zOnhz%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNp%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuRmVkZXJhdGVkSWRlbnRpZmll%0D%0AciI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmluZyI+%0D%0AMDJiMmJiZDNmYTNiYTIwOWJmODAxN2Q3ODcyYjM5MTUyM2Y2MjI4ZjU3NmQ1%0D%0ANmQ1ZjdlZGRmMDQ4MWZjOTAwNjwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3Nh%0D%0AbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkZpcnN0%0D%0ATmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmlu%0D%0AZyI+Tm90PC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuTGFzdE5hbWUiPjxzYW1sOkF0%0D%0AdHJpYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPkphcm9uPC9zYW1s%0D%0AOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmli%0D%0AdXRlIE5hbWU9IlVzZXIuQWxpYXMiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhz%0D%0AaTp0eXBlPSJ4czpzdHJpbmciPk5vdCBKYXJvbjwvc2FtbDpBdHRyaWJ1dGVW%0D%0AYWx1ZT48L3NhbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJV%0D%0Ac2VyLkVtYWlsIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6%0D%0Ac3RyaW5nIj50ZXN0QGV4YW1wbGUuY29tPC9zYW1sOkF0dHJpYnV0ZVZhbHVl%0D%0APjwvc2FtbDpBdHRyaWJ1dGU+PHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIu%0D%0AVXNlcm5hbWUiPjxzYW1sOkF0dHJpYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4czpz%0D%0AdHJpbmciPmZpZWxkYWRtaW5zZXR1cF9yZW1vdmVtZTM3ODM8L3NhbWw6QXR0%0D%0AcmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUg%0D%0ATmFtZT0iVXNlci5Mb2NhbGVTaWRLZXkiLz48c2FtbDpBdHRyaWJ1dGUgTmFt%0D%0AZT0iQ2FudmFzLlVzZXJJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5%0D%0AcGU9InhzOnN0cmluZyI+ZmllbGRhZG1pbnNldHVwX3JlbW92ZW1lMzc4Mzwv%0D%0Ac2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6QXR0cmlidXRlPjxzYW1sOkF0%0D%0AdHJpYnV0ZSBOYW1lPSJDYW52YXMuUm9vdEFjY291bnRJRCI+PHNhbWw6QXR0%0D%0AcmlidXRlVmFsdWU+OTc1ODAwMDAwMDAwMDAwMDk8L3NhbWw6QXR0cmlidXRl%0D%0AVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0i%0D%0AQ2FudmFzLlJvb3RBY2NvdW50VVJMIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4%0D%0Ac2k6dHlwZT0ieHM6c3RyaW5nIj5qam9obnNvbi5pbnN0cnVjdHVyZS5jb208%0D%0AL3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48L3NhbWw6%0D%0AQXR0cmlidXRlU3RhdGVtZW50Pjwvc2FtbDpBc3NlcnRpb24+PC9zYW1scDpS%0D%0AZXNwb25zZT4K%0D%0A",
    // "samlResponseEncoded": "fortestingonly",
    "federatedId": "02b2bbd3fa3ba209bf8017d7872b391523f6228f576d56d5f7eddf0481fc9006"
  }
]

// getFedId(sampleData)