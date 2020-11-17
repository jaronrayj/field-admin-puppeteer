//////////////////////////////////////////////////////////////////////////////
// Project:       Create Field Admin Automation (Pony Project)
// Function:      getFederatedID (samlResponse) 
// Author:        Jon Howard
// Date Created:  07/21/2020
//
// Purpose:       Function to use Selenium to pull the Federated ID from the Salesforce 
//                SAML Validator at https://instructure.my.salesforce.com/setup/secur/SAMLValidationPage.apexp
//
// Usage:         vvar federatedID = await getFederatedID.getFederatedID(samlResponse);
//
// Parameters: 
//    samlResponseArray:  An array of JSON objects including the SAML Response from an attempted login by a Canvas user
//        Format:         [{"domain":"jperkins.test.instructure.com",
//                          "userUrl":"https://jperkins.test.instructure.com/users/30",
//                          "sfUrl":"",
//                          "samlResponse":"blah",    << URIEncoded
//                          "federatedID",""}]        << WE ARE FILLING THIS OUT
//
// Return:        
//    samlResponseArray:  Return the original array with Federated ID included
//        Format:         [{"domain":"jperkins.test.instructure.com",
//                          "userUrl":"https://jperkins.test.instructure.com/users/30",
//                          "sfUrl":"",
//                          "samlResponse":"blah",
//                          "federatedID":""}]        << WE ARE FILLING THIS OUT
//
// Revision History:
// Date:        Author         Version    Notes
// 07/21/2020   Jon Howard     1          Initial version
//
//////////////////////////////////////////////////////////////////////////////

// Requires
const {Builder, By, Key, until} = require('selenium-webdriver');        // Selenium itself
require('chromedriver');                                                // The Chrome driver

// Wait function
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } 

// Get the federated id
async function getFederatedID (samlResponseArray) {
  return new Promise(async (resolve, reject) => {

    'use strict';

    // Requires
    const {Builder, By, Key, until} = require('selenium-webdriver');        // Selenium itself
    require('chromedriver');                                                // The Chrome driver

    // Declare vars
    var federatedID = "None";         // Set a default value for the Federated ID
//    var samlInputField;               // The var used to hold the SAML Response for validation
    var samlResponse = "";             // Holds an array element's samlResponse

    var username = process.env.OKTA_USERNAME;      // OKTA Username
    var password = process.env.OKTA_PASSWORD;    // OKTA Password

    // Debug/testing flags
    const DEBUG = false;               // Write more info to the console

    // Make sure we got an array before doing anything
    if (Array.isArray(samlResponseArray) == false) {
      return reject("samlResponseArray is not an array");
    }

    // Open Chrome
    var driver = await new Builder().forBrowser("chrome").build();
    try {
        // Go to the Salesforce page and you will be sent to to login
        await driver.get("https://instructure.my.salesforce.com/setup/secur/SAMLValidationPage.apexp");
        await driver.findElement(By.className("button mb24 secondary wide")).click();    // Click the OKTA button
        
        // Wait until the response comes back the the Sign In title
        await driver.wait(until.titleIs("Instructure - Sign In"), 5000);    
        // Fill in the username
        await driver.findElement(By.name("username")).sendKeys(username);   
        await driver.findElement(By.name("password")).sendKeys(password);   
        // If we have a password, go ahead on login
        if (password != "") {
          await driver.findElement(By.className("button button-primary")).click();    // Click to login
        }

        // Wait for the 2FA page - It has the same title as the prev page 'Instructure - Sign In', so wait for the Send Push button instead
        // Wait 60 secs in case the user is manually logging in
        await driver.wait(until.elementLocated(By.xpath("//input[@value='Send Push']")), 60000);
        await driver.findElement(By.xpath("//input[@value='Send Push']")).click()   // Click to send the push notification - the button doesn't have a classname, so use value
        
        // Wait until the response comes back
        // Wait a while for the login due to 2FA time (60 secs)
        await driver.wait(until.titleIs("Salesforce - Unlimited Edition"), 60000);

        // Loop through passed in array
        for (var i=0;i<samlResponseArray.length;i++) {
          // Get the samlResponse
          // The SAMLResponse is being passed in URI encoded. Decode it for the search
          var samlResponse = decodeURI(samlResponseArray[i].samlResponse);

          // Fill in the field with the passed in SAMLResponse. Clear it first, enter the text, make sure 'Canvas Login' is selected, then press the validate button
          await driver.findElement(By.name("thePage:block:theForm:Assertion")).clear(); 
          await driver.findElement(By.name("thePage:block:theForm:Assertion")).sendKeys(samlResponse); 

          await driver.findElement(By.name("thePage:block:theForm:configId")).sendKeys("Canvas Login");    // Select Canvas Login
          await driver.findElement(By.name("thePage:block:theForm:Validate")).click(); 
          
          // Get the full body text (the Subject field isn't named), then get the ID between "Subject: " and "AssertionId:"
          // The area we are looking at looks like:
          // Subject: 4231c65eaccfef359c0985ff4383d49ff248ab86c8abcaea88290c74697ba73a
          // Unable to map the subject to a Salesforce user
          // AssertionId: _1fc5fc56-cf17-44cb-a4d2-9081314f22d4
          federatedID = await driver.findElement(By.xpath("//*[text()[contains(.,'Subject:')]]")).getText(); 
          if (DEBUG == true) {console.log("Full Text: " + federatedID);}
          var startString = "Subject: ";  // Note the trailing space
          var endString = "\nUnable";
          federatedID = federatedID.substring(federatedID.indexOf(startString)+startString.length,federatedID.indexOf(endString));
          if (DEBUG == true) {console.log("FederatedID: " + federatedID);}

          samlResponseArray[i].federatedID = federatedID;
          samlResponse = "";
        }

        // Return the samlResponseArray that now includes the Federated ID and resolve the promise
        console.log
        return resolve(samlResponseArray);

    } finally {
        // Quit the driver (close Chrome)
        await driver.quit();
    }
  })
};

// (async function main() {
//   // This is a unit test function. We pass in a SAML Response and check for the expect return
//   // This SAML Response is only good for a time, so you will need to get a new one regularily
  
//   // samlResponse is going to be URL encoded, so init it then decode it
//   var samlResponseArray = [{
//     "domain": "jperkins.test.instructure.com",
//     "userUrl": "https://jperkins.test.instructure.com/users/30",
//     "sfUrl": "",
//     "samlResponse": "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6%0D%0AdGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpu%0D%0AYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfMGE5OGVkOGUtMTAz%0D%0AOS00YmZlLThjYWMtZGMyZWU2OWRkMzc1IiBWZXJzaW9uPSIyLjAiIElzc3Vl%0D%0ASW5zdGFudD0iMjAyMC0wNy0yMlQxODo0ODoyOFoiIERlc3RpbmF0aW9uPSJo%0D%0AdHRwczovL2FkbWluY29uc29sZS5jYW52YXNsbXMuY29tL2xvZ2luP3NvPTAw%0D%0AREEwMDAwMDAwSWJzayIgSW5SZXNwb25zZVRvPSJfMkNBQUFBWFFJRFF0U01F%0D%0AOHdRVEF3TURBd01EQXdNREF4QUFBQTR1VmdfOXpNaHNmQ2VlZWltcXZmY3h1%0D%0ANm83NXFTNmJMZDVYWGVmeFQtZ2tjN29CTlFWWUtXWlZGTFFmM0pCRVNnRU4y%0D%0AWF9DWmZmQjZZUG1wSktENC1CbFdTTnNvQy1nanVGMkRQQV9lS3hXTHZtQi04%0D%0ATTRPTTU2QWhlMkNxYmZxVVRfTFltcXZVU3NnR2NxRXZOaW53cTJqOVB6UTNT%0D%0AaTNCRG5vYWFQTmpHUTdRbzF2NkNtQWtNVDFCbUViS1VhOGFneHd3aGRwSE16%0D%0AS2FVbGNPVV9veU1abjJJbTJsSkMzVGZqM1dSZ19BYUs1VFUwb29uZ1VCRWNf%0D%0ARjRCXzhTRWRudyI+PHNhbWw6SXNzdWVyPmh0dHBzOi8vc3NvLmNhbnZhc2xt%0D%0Acy5jb20vU0FNTDI8L3NhbWw6SXNzdWVyPjxzYW1scDpTdGF0dXM+PHNhbWxw%0D%0AOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIu%0D%0AMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbHA6U3RhdHVzPjxzYW1sOkFzc2Vy%0D%0AdGlvbiBJRD0iX2Y2YmUzZTJmLTJlYjItNDViMi04ZWY5LTRmZDE1M2M4ODMw%0D%0AMiIgVmVyc2lvbj0iMi4wIiBJc3N1ZUluc3RhbnQ9IjIwMjAtMDctMjJUMTg6%0D%0ANDg6MjhaIj48c2FtbDpJc3N1ZXI+aHR0cHM6Ly9zc28uY2FudmFzbG1zLmNv%0D%0AbS9TQU1MMjwvc2FtbDpJc3N1ZXI+PFNpZ25hdHVyZSB4bWxucz0iaHR0cDov%0D%0AL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+CjxTaWduZWRJbmZvPgo8%0D%0AQ2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cu%0D%0AdzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPgo8U2lnbmF0dXJlTWV0%0D%0AaG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxk%0D%0Ac2lnLW1vcmUjcnNhLXNoYTI1NiIvPgo8UmVmZXJlbmNlIFVSST0iI19mNmJl%0D%0AM2UyZi0yZWIyLTQ1YjItOGVmOS00ZmQxNTNjODgzMDIiPgo8VHJhbnNmb3Jt%0D%0Acz4KPFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+CjxUcmFuc2Zv%0D%0Acm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1l%0D%0AeGMtYzE0biMiLz4KPC9UcmFuc2Zvcm1zPgo8RGlnZXN0TWV0aG9kIEFsZ29y%0D%0AaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2%0D%0AIi8+CjxEaWdlc3RWYWx1ZT5oeC9PUVlPdHEwVVpBNUxXMUJGNWF5bGVMOUtU%0D%0AeXdzdWU1SUw0amNoSHFFPTwvRGlnZXN0VmFsdWU+CjwvUmVmZXJlbmNlPgo8%0D%0AL1NpZ25lZEluZm8+CjxTaWduYXR1cmVWYWx1ZT42YVRjNU5uY0xKY2pwSWpp%0D%0AL2lyZXN5RGhGRmVXUHJnaDZpVjNiYmp2aTdtSGt3NXkwZVdlN2ZOa3Q2VHoy%0D%0AdE9VCmxaZ2RmRzlhRUZxS0RUVisyWUZRMnd2ZXRVK0RtWDJtUDdDc09rR3o2%0D%0Ac1hTVXE3bHBGY3BaY0JkWDNCSHZobWMKUGRHZGVmS0dIY3VCTFNVMEV4MnNL%0D%0ASm4vTkgvb2JvcW1wZFhOUTljUlgzbTZWR0tub0hoRzNoQ3ZBV1hVNzV1dQo0%0D%0Ad1F0UEhSS1VZSi8zZ2VWenBlM2d3ejNCZEdBdXJORzZMekV5Qlk1Y1o0ZFd0%0D%0Ad3d1VlJZT0VnMGJNZDY1bkFPCkp1VXVXV3ppZmpoN1ZHWUJLZkRkSFZ4OVkx%0D%0AZVA0YW1qeU1lN3JLSmU5WDBvNkNFUGs4dWFOVnRPVG5MS1MzSkQKamhpd1JX%0D%0AYzZBYWZNVThMYXBrbXl5Zz09PC9TaWduYXR1cmVWYWx1ZT4KPEtleUluZm8+%0D%0ACjxYNTA5RGF0YT4KPFg1MDlDZXJ0aWZpY2F0ZT5NSUlFTURDQ0F4aWdBd0lC%0D%0AQWdJSkFQQlhnZXp0bjhVMk1BMEdDU3FHU0liM0RRRUJDd1VBTUlHc01Rc3dD%0D%0AUVlEClZRUUdFd0pWVXpFTk1Bc0dBMVVFQ0F3RVZYUmhhREVYTUJVR0ExVUVC%0D%0Ad3dPVTJGc2RDQk1ZV3RsSUVOcGRIa3gKR2pBWUJnTlZCQW9NRVVsdWMzUnlk%0D%0AV04wZFhKbExDQkpibU11TVJNd0VRWURWUVFMREFwUGNHVnlZWFJwYjI1egpN%0D%0AU0F3SGdZRFZRUUREQmREWVc1MllYTWdVMEZOVENCRFpYSjBhV1pwWTJGMFpU%0D%0ARWlNQ0FHQ1NxR1NJYjNEUUVKCkFSWVRiM0J6UUdsdWMzUnlkV04wZFhKbExt%0D%0ATnZiVEFlRncweE9UQXpNakV4TlRNNU1EUmFGdzB5T1RBek1UZ3gKTlRNNU1E%0D%0AUmFNSUdzTVFzd0NRWURWUVFHRXdKVlV6RU5NQXNHQTFVRUNBd0VWWFJoYURF%0D%0AWE1CVUdBMVVFQnd3TwpVMkZzZENCTVlXdGxJRU5wZEhreEdqQVlCZ05WQkFv%0D%0ATUVVbHVjM1J5ZFdOMGRYSmxMQ0JKYm1NdU1STXdFUVlEClZRUUxEQXBQY0dW%0D%0AeVlYUnBiMjV6TVNBd0hnWURWUVFEREJkRFlXNTJZWE1nVTBGTlRDQkRaWEow%0D%0AYVdacFkyRjAKWlRFaU1DQUdDU3FHU0liM0RRRUpBUllUYjNCelFHbHVjM1J5%0D%0AZFdOMGRYSmxMbU52YlRDQ0FTSXdEUVlKS29aSQpodmNOQVFFQkJRQURnZ0VQ%0D%0AQURDQ0FRb0NnZ0VCQVBYb1lDVzlRUHJ0Zm4wK1dMWDQzWXRNODlnTEhyblNN%0D%0AMHJSClRjKzBEUTlUVVpLS3JtYTgwWHZ3T1MzSzBoamY3ayttQWxhcllwdHdY%0D%0AdVBPYVM2K0xNUmd4QlJ4L2lXZHVnS3IKeVdLcHdieloxM3YxVG5MWjFyYzZU%0D%0AaHlSdWlsdktJUEQ3ZFAzcnYrQTFFellZazlaR3RkNWdGU0JVdFVxRndqMQo3%0D%0ANkNVYUVqQ0lOOEZhb2diYnBwV2kvQzFrV3RQdlBZK1VlWjRJQkpVcGorZWN0%0D%0AOHJiaGRWcTVGeERFclJkQXpICkNJaTZ4U3FsTHFtVjEzcnFENHNyTXRFOThk%0D%0AKzlLaTJoYXQzeU56M21tYjVhWmRpTFFrNkRvc2ZRbUhmTnk2SlMKR3lWd21B%0D%0AWk9QQjVzc0Z1TmZRWkZLOW82V0c1dW1TL2FFTi9zc2ZXLzd1TTlURGtrS3Zz%0D%0AQ0F3RUFBYU5UTUZFdwpIUVlEVlIwT0JCWUVGQXJhUTA0MTRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUI4R0ExVWRJd1FZTUJhQUZBcmFRMDQxCjRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNO%0D%0AQVFFTEJRQUQKZ2dFQkFBK0FhTS9kUExpZG9QTkpsS2o5elE5YVR2SklGN01R%0D%0AaGZyTmtlTmtNcEdtRTBpZ3laRnE2ejJXdUE1dQpVMmNGL2Y3ak5UQnFhYUZF%0D%0AYm5BOEJpUmxFL0ZyVExISUlnUDVKWDIrbjFXbWFrSS9hVmJuWElDdnJWUm44%0D%0ANFl0CjVTSGRWYWNJNVdodjNSS2dSemtwQk9iOWpnWitFNGtlQXZ0eEhVdUlN%0D%0ATUV0eFQvZnlTd0ZhUmZHMFdpdDZmeFgKYnVEaXVjTVdaK3ZFWTI0M2xPNk9S%0D%0AUFRpTWVNY1pHUnFBNXByd0FXeWZMemtYVzFYNVUzR1hoV1c3WlJtSHhrVAo4%0D%0ARXdwcFNlb3NpZ0puWUlqaHJYRnNpTFU3d3BsbkREOXlmZStobzcwWkczbWIy%0D%0ATWdmRzU5WkxUenYzbCtBbmF1CkJOK2Y2a3lZWjl6dGR2dWVYOFNVcDVUNHM0%0D%0AMD08L1g1MDlDZXJ0aWZpY2F0ZT4KPC9YNTA5RGF0YT4KPC9LZXlJbmZvPgo8%0D%0AL1NpZ25hdHVyZT48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRCBGb3JtYXQ9%0D%0AInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnBl%0D%0AcnNpc3RlbnQiPmM0NmExOWMyY2Y3ZDI1ZGUzNDU1Y2JlYjY4YzRjNWVlMGRi%0D%0AMmEwYTQzYTcwMjQwNTc5NTk2MjJjMGQ1YjYwNmQ8L3NhbWw6TmFtZUlEPjxz%0D%0AYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFt%0D%0AZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmly%0D%0AbWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjAtMDctMjJUMTg6NDg6NTha%0D%0AIiBSZWNpcGllbnQ9Imh0dHBzOi8vYWRtaW5jb25zb2xlLmNhbnZhc2xtcy5j%0D%0Ab20vbG9naW4/c289MDBEQTAwMDAwMDBJYnNrIiBJblJlc3BvbnNlVG89Il8y%0D%0AQ0FBQUFYUUlEUXRTTUU4d1FUQXdNREF3TURBd01EQXhBQUFBNHVWZ185ek1o%0D%0Ac2ZDZWVlaW1xdmZjeHU2bzc1cVM2YkxkNVhYZWZ4VC1na2M3b0JOUVZZS1da%0D%0AVkZMUWYzSkJFU2dFTjJYX0NaZmZCNllQbXBKS0Q0LUJsV1NOc29DLWdqdUYy%0D%0ARFBBX2VLeFdMdm1CLThNNE9NNTZBaGUyQ3FiZnFVVF9MWW1xdlVTc2dHY3FF%0D%0Adk5pbndxMmo5UHpRM1NpM0JEbm9hYVBOakdRN1FvMXY2Q21Ba01UMUJtRWJL%0D%0AVWE4YWd4d3doZHBITXpLYVVsY09VX295TVpuMkltMmxKQzNUZmozV1JnX0Fh%0D%0ASzVUVTBvb25nVUJFY19GNEJfOFNFZG53Ii8+PC9zYW1sOlN1YmplY3RDb25m%0D%0AaXJtYXRpb24+PC9zYW1sOlN1YmplY3Q+PHNhbWw6Q29uZGl0aW9ucyBOb3RC%0D%0AZWZvcmU9IjIwMjAtMDctMjJUMTg6NDg6MjNaIiBOb3RPbk9yQWZ0ZXI9IjIw%0D%0AMjAtMDctMjJUMTg6NDg6NThaIj48c2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9u%0D%0APjxzYW1sOkF1ZGllbmNlPmh0dHBzOi8vc2FtbC5zYWxlc2ZvcmNlLmNvbTwv%0D%0Ac2FtbDpBdWRpZW5jZT48L3NhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48L3Nh%0D%0AbWw6Q29uZGl0aW9ucz48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRobkluc3Rh%0D%0AbnQ9IjIwMjAtMDctMjJUMTg6NDg6MjhaIj48c2FtbDpBdXRobkNvbnRleHQ+%0D%0APHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRj%0D%0AOlNBTUw6Mi4wOmFjOmNsYXNzZXM6dW5zcGVjaWZpZWQ8L3NhbWw6QXV0aG5D%0D%0Ab250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0%0D%0AaG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50IHhtbG5zOnhz%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNp%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuRmVkZXJhdGVkSWRlbnRpZmll%0D%0AciI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmluZyI+%0D%0AYzQ2YTE5YzJjZjdkMjVkZTM0NTVjYmViNjhjNGM1ZWUwZGIyYTBhNDNhNzAy%0D%0ANDA1Nzk1OTYyMmMwZDViNjA2ZDwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3Nh%0D%0AbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkZpcnN0%0D%0ATmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmlu%0D%0AZyI+U3VwcG9ydCBBZG1pbjwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6%0D%0AQXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkxhc3ROYW1l%0D%0AIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6c3RyaW5nIj5U%0D%0AZXN0aW5nPC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuQWxpYXMiPjxzYW1sOkF0dHJp%0D%0AYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPlN1cHBvcnQgQWRtaW4g%0D%0AVGVzdGluZzwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6QXR0cmlidXRl%0D%0APjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkVtYWlsIi8+PHNhbWw6QXR0%0D%0AcmlidXRlIE5hbWU9IlVzZXIuVXNlcm5hbWUiPjxzYW1sOkF0dHJpYnV0ZVZh%0D%0AbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPnN1cHBvcnRfYWRtaW48L3NhbWw6%0D%0AQXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1%0D%0AdGUgTmFtZT0iVXNlci5Mb2NhbGVTaWRLZXkiLz48c2FtbDpBdHRyaWJ1dGUg%0D%0ATmFtZT0iQ2FudmFzLlVzZXJJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNp%0D%0AOnR5cGU9InhzOnN0cmluZyI+c3VwcG9ydF9hZG1pbjwvc2FtbDpBdHRyaWJ1%0D%0AdGVWYWx1ZT48L3NhbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1l%0D%0APSJDYW52YXMuUm9vdEFjY291bnRJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWU+%0D%0AOTc1ODAwMDAwMDAwMDU2MTc8L3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1s%0D%0AOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iQ2FudmFzLlJvb3RB%0D%0AY2NvdW50VVJMIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6%0D%0Ac3RyaW5nIj5qb25ob3dhcmQuaW5zdHJ1Y3R1cmUuY29tPC9zYW1sOkF0dHJp%0D%0AYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PC9zYW1sOkF0dHJpYnV0ZVN0%0D%0AYXRlbWVudD48L3NhbWw6QXNzZXJ0aW9uPjwvc2FtbHA6UmVzcG9uc2U+Cg==%0D%0A",
//     "federatedID": ""
//     },
//     {
//     "domain": "jperkins.test.instructure.com",
//     "userUrl": "https://jperkins.test.instructure.com/users/30",
//     "sfUrl": "",
//     "samlResponse": "PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6%0D%0AdGM6U0FNTDoyLjA6cHJvdG9jb2wiIHhtbG5zOnNhbWw9InVybjpvYXNpczpu%0D%0AYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24iIElEPSJfMGE5OGVkOGUtMTAz%0D%0AOS00YmZlLThjYWMtZGMyZWU2OWRkMzc1IiBWZXJzaW9uPSIyLjAiIElzc3Vl%0D%0ASW5zdGFudD0iMjAyMC0wNy0yMlQxODo0ODoyOFoiIERlc3RpbmF0aW9uPSJo%0D%0AdHRwczovL2FkbWluY29uc29sZS5jYW52YXNsbXMuY29tL2xvZ2luP3NvPTAw%0D%0AREEwMDAwMDAwSWJzayIgSW5SZXNwb25zZVRvPSJfMkNBQUFBWFFJRFF0U01F%0D%0AOHdRVEF3TURBd01EQXdNREF4QUFBQTR1VmdfOXpNaHNmQ2VlZWltcXZmY3h1%0D%0ANm83NXFTNmJMZDVYWGVmeFQtZ2tjN29CTlFWWUtXWlZGTFFmM0pCRVNnRU4y%0D%0AWF9DWmZmQjZZUG1wSktENC1CbFdTTnNvQy1nanVGMkRQQV9lS3hXTHZtQi04%0D%0ATTRPTTU2QWhlMkNxYmZxVVRfTFltcXZVU3NnR2NxRXZOaW53cTJqOVB6UTNT%0D%0AaTNCRG5vYWFQTmpHUTdRbzF2NkNtQWtNVDFCbUViS1VhOGFneHd3aGRwSE16%0D%0AS2FVbGNPVV9veU1abjJJbTJsSkMzVGZqM1dSZ19BYUs1VFUwb29uZ1VCRWNf%0D%0ARjRCXzhTRWRudyI+PHNhbWw6SXNzdWVyPmh0dHBzOi8vc3NvLmNhbnZhc2xt%0D%0Acy5jb20vU0FNTDI8L3NhbWw6SXNzdWVyPjxzYW1scDpTdGF0dXM+PHNhbWxw%0D%0AOlN0YXR1c0NvZGUgVmFsdWU9InVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIu%0D%0AMDpzdGF0dXM6U3VjY2VzcyIvPjwvc2FtbHA6U3RhdHVzPjxzYW1sOkFzc2Vy%0D%0AdGlvbiBJRD0iX2Y2YmUzZTJmLTJlYjItNDViMi04ZWY5LTRmZDE1M2M4ODMw%0D%0AMiIgVmVyc2lvbj0iMi4wIiBJc3N1ZUluc3RhbnQ9IjIwMjAtMDctMjJUMTg6%0D%0ANDg6MjhaIj48c2FtbDpJc3N1ZXI+aHR0cHM6Ly9zc28uY2FudmFzbG1zLmNv%0D%0AbS9TQU1MMjwvc2FtbDpJc3N1ZXI+PFNpZ25hdHVyZSB4bWxucz0iaHR0cDov%0D%0AL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnIyI+CjxTaWduZWRJbmZvPgo8%0D%0AQ2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cu%0D%0AdzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyIvPgo8U2lnbmF0dXJlTWV0%0D%0AaG9kIEFsZ29yaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxk%0D%0Ac2lnLW1vcmUjcnNhLXNoYTI1NiIvPgo8UmVmZXJlbmNlIFVSST0iI19mNmJl%0D%0AM2UyZi0yZWIyLTQ1YjItOGVmOS00ZmQxNTNjODgzMDIiPgo8VHJhbnNmb3Jt%0D%0Acz4KPFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvMDkveG1sZHNpZyNlbnZlbG9wZWQtc2lnbmF0dXJlIi8+CjxUcmFuc2Zv%0D%0Acm0gQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzEwL3htbC1l%0D%0AeGMtYzE0biMiLz4KPC9UcmFuc2Zvcm1zPgo8RGlnZXN0TWV0aG9kIEFsZ29y%0D%0AaXRobT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjc2hhMjU2%0D%0AIi8+CjxEaWdlc3RWYWx1ZT5oeC9PUVlPdHEwVVpBNUxXMUJGNWF5bGVMOUtU%0D%0AeXdzdWU1SUw0amNoSHFFPTwvRGlnZXN0VmFsdWU+CjwvUmVmZXJlbmNlPgo8%0D%0AL1NpZ25lZEluZm8+CjxTaWduYXR1cmVWYWx1ZT42YVRjNU5uY0xKY2pwSWpp%0D%0AL2lyZXN5RGhGRmVXUHJnaDZpVjNiYmp2aTdtSGt3NXkwZVdlN2ZOa3Q2VHoy%0D%0AdE9VCmxaZ2RmRzlhRUZxS0RUVisyWUZRMnd2ZXRVK0RtWDJtUDdDc09rR3o2%0D%0Ac1hTVXE3bHBGY3BaY0JkWDNCSHZobWMKUGRHZGVmS0dIY3VCTFNVMEV4MnNL%0D%0ASm4vTkgvb2JvcW1wZFhOUTljUlgzbTZWR0tub0hoRzNoQ3ZBV1hVNzV1dQo0%0D%0Ad1F0UEhSS1VZSi8zZ2VWenBlM2d3ejNCZEdBdXJORzZMekV5Qlk1Y1o0ZFd0%0D%0Ad3d1VlJZT0VnMGJNZDY1bkFPCkp1VXVXV3ppZmpoN1ZHWUJLZkRkSFZ4OVkx%0D%0AZVA0YW1qeU1lN3JLSmU5WDBvNkNFUGs4dWFOVnRPVG5MS1MzSkQKamhpd1JX%0D%0AYzZBYWZNVThMYXBrbXl5Zz09PC9TaWduYXR1cmVWYWx1ZT4KPEtleUluZm8+%0D%0ACjxYNTA5RGF0YT4KPFg1MDlDZXJ0aWZpY2F0ZT5NSUlFTURDQ0F4aWdBd0lC%0D%0AQWdJSkFQQlhnZXp0bjhVMk1BMEdDU3FHU0liM0RRRUJDd1VBTUlHc01Rc3dD%0D%0AUVlEClZRUUdFd0pWVXpFTk1Bc0dBMVVFQ0F3RVZYUmhhREVYTUJVR0ExVUVC%0D%0Ad3dPVTJGc2RDQk1ZV3RsSUVOcGRIa3gKR2pBWUJnTlZCQW9NRVVsdWMzUnlk%0D%0AV04wZFhKbExDQkpibU11TVJNd0VRWURWUVFMREFwUGNHVnlZWFJwYjI1egpN%0D%0AU0F3SGdZRFZRUUREQmREWVc1MllYTWdVMEZOVENCRFpYSjBhV1pwWTJGMFpU%0D%0ARWlNQ0FHQ1NxR1NJYjNEUUVKCkFSWVRiM0J6UUdsdWMzUnlkV04wZFhKbExt%0D%0ATnZiVEFlRncweE9UQXpNakV4TlRNNU1EUmFGdzB5T1RBek1UZ3gKTlRNNU1E%0D%0AUmFNSUdzTVFzd0NRWURWUVFHRXdKVlV6RU5NQXNHQTFVRUNBd0VWWFJoYURF%0D%0AWE1CVUdBMVVFQnd3TwpVMkZzZENCTVlXdGxJRU5wZEhreEdqQVlCZ05WQkFv%0D%0ATUVVbHVjM1J5ZFdOMGRYSmxMQ0JKYm1NdU1STXdFUVlEClZRUUxEQXBQY0dW%0D%0AeVlYUnBiMjV6TVNBd0hnWURWUVFEREJkRFlXNTJZWE1nVTBGTlRDQkRaWEow%0D%0AYVdacFkyRjAKWlRFaU1DQUdDU3FHU0liM0RRRUpBUllUYjNCelFHbHVjM1J5%0D%0AZFdOMGRYSmxMbU52YlRDQ0FTSXdEUVlKS29aSQpodmNOQVFFQkJRQURnZ0VQ%0D%0AQURDQ0FRb0NnZ0VCQVBYb1lDVzlRUHJ0Zm4wK1dMWDQzWXRNODlnTEhyblNN%0D%0AMHJSClRjKzBEUTlUVVpLS3JtYTgwWHZ3T1MzSzBoamY3ayttQWxhcllwdHdY%0D%0AdVBPYVM2K0xNUmd4QlJ4L2lXZHVnS3IKeVdLcHdieloxM3YxVG5MWjFyYzZU%0D%0AaHlSdWlsdktJUEQ3ZFAzcnYrQTFFellZazlaR3RkNWdGU0JVdFVxRndqMQo3%0D%0ANkNVYUVqQ0lOOEZhb2diYnBwV2kvQzFrV3RQdlBZK1VlWjRJQkpVcGorZWN0%0D%0AOHJiaGRWcTVGeERFclJkQXpICkNJaTZ4U3FsTHFtVjEzcnFENHNyTXRFOThk%0D%0AKzlLaTJoYXQzeU56M21tYjVhWmRpTFFrNkRvc2ZRbUhmTnk2SlMKR3lWd21B%0D%0AWk9QQjVzc0Z1TmZRWkZLOW82V0c1dW1TL2FFTi9zc2ZXLzd1TTlURGtrS3Zz%0D%0AQ0F3RUFBYU5UTUZFdwpIUVlEVlIwT0JCWUVGQXJhUTA0MTRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUI4R0ExVWRJd1FZTUJhQUZBcmFRMDQxCjRSeWlmQlBHOUxm%0D%0AbE5UaVZGRjdmTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3RFFZSktvWklodmNO%0D%0AQVFFTEJRQUQKZ2dFQkFBK0FhTS9kUExpZG9QTkpsS2o5elE5YVR2SklGN01R%0D%0AaGZyTmtlTmtNcEdtRTBpZ3laRnE2ejJXdUE1dQpVMmNGL2Y3ak5UQnFhYUZF%0D%0AYm5BOEJpUmxFL0ZyVExISUlnUDVKWDIrbjFXbWFrSS9hVmJuWElDdnJWUm44%0D%0ANFl0CjVTSGRWYWNJNVdodjNSS2dSemtwQk9iOWpnWitFNGtlQXZ0eEhVdUlN%0D%0ATUV0eFQvZnlTd0ZhUmZHMFdpdDZmeFgKYnVEaXVjTVdaK3ZFWTI0M2xPNk9S%0D%0AUFRpTWVNY1pHUnFBNXByd0FXeWZMemtYVzFYNVUzR1hoV1c3WlJtSHhrVAo4%0D%0ARXdwcFNlb3NpZ0puWUlqaHJYRnNpTFU3d3BsbkREOXlmZStobzcwWkczbWIy%0D%0ATWdmRzU5WkxUenYzbCtBbmF1CkJOK2Y2a3lZWjl6dGR2dWVYOFNVcDVUNHM0%0D%0AMD08L1g1MDlDZXJ0aWZpY2F0ZT4KPC9YNTA5RGF0YT4KPC9LZXlJbmZvPgo8%0D%0AL1NpZ25hdHVyZT48c2FtbDpTdWJqZWN0PjxzYW1sOk5hbWVJRCBGb3JtYXQ9%0D%0AInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpuYW1laWQtZm9ybWF0OnBl%0D%0AcnNpc3RlbnQiPmM0NmExOWMyY2Y3ZDI1ZGUzNDU1Y2JlYjY4YzRjNWVlMGRi%0D%0AMmEwYTQzYTcwMjQwNTc5NTk2MjJjMGQ1YjYwNmQ8L3NhbWw6TmFtZUlEPjxz%0D%0AYW1sOlN1YmplY3RDb25maXJtYXRpb24gTWV0aG9kPSJ1cm46b2FzaXM6bmFt%0D%0AZXM6dGM6U0FNTDoyLjA6Y206YmVhcmVyIj48c2FtbDpTdWJqZWN0Q29uZmly%0D%0AbWF0aW9uRGF0YSBOb3RPbk9yQWZ0ZXI9IjIwMjAtMDctMjJUMTg6NDg6NTha%0D%0AIiBSZWNpcGllbnQ9Imh0dHBzOi8vYWRtaW5jb25zb2xlLmNhbnZhc2xtcy5j%0D%0Ab20vbG9naW4/c289MDBEQTAwMDAwMDBJYnNrIiBJblJlc3BvbnNlVG89Il8y%0D%0AQ0FBQUFYUUlEUXRTTUU4d1FUQXdNREF3TURBd01EQXhBQUFBNHVWZ185ek1o%0D%0Ac2ZDZWVlaW1xdmZjeHU2bzc1cVM2YkxkNVhYZWZ4VC1na2M3b0JOUVZZS1da%0D%0AVkZMUWYzSkJFU2dFTjJYX0NaZmZCNllQbXBKS0Q0LUJsV1NOc29DLWdqdUYy%0D%0ARFBBX2VLeFdMdm1CLThNNE9NNTZBaGUyQ3FiZnFVVF9MWW1xdlVTc2dHY3FF%0D%0Adk5pbndxMmo5UHpRM1NpM0JEbm9hYVBOakdRN1FvMXY2Q21Ba01UMUJtRWJL%0D%0AVWE4YWd4d3doZHBITXpLYVVsY09VX295TVpuMkltMmxKQzNUZmozV1JnX0Fh%0D%0ASzVUVTBvb25nVUJFY19GNEJfOFNFZG53Ii8+PC9zYW1sOlN1YmplY3RDb25m%0D%0AaXJtYXRpb24+PC9zYW1sOlN1YmplY3Q+PHNhbWw6Q29uZGl0aW9ucyBOb3RC%0D%0AZWZvcmU9IjIwMjAtMDctMjJUMTg6NDg6MjNaIiBOb3RPbk9yQWZ0ZXI9IjIw%0D%0AMjAtMDctMjJUMTg6NDg6NThaIj48c2FtbDpBdWRpZW5jZVJlc3RyaWN0aW9u%0D%0APjxzYW1sOkF1ZGllbmNlPmh0dHBzOi8vc2FtbC5zYWxlc2ZvcmNlLmNvbTwv%0D%0Ac2FtbDpBdWRpZW5jZT48L3NhbWw6QXVkaWVuY2VSZXN0cmljdGlvbj48L3Nh%0D%0AbWw6Q29uZGl0aW9ucz48c2FtbDpBdXRoblN0YXRlbWVudCBBdXRobkluc3Rh%0D%0AbnQ9IjIwMjAtMDctMjJUMTg6NDg6MjhaIj48c2FtbDpBdXRobkNvbnRleHQ+%0D%0APHNhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+dXJuOm9hc2lzOm5hbWVzOnRj%0D%0AOlNBTUw6Mi4wOmFjOmNsYXNzZXM6dW5zcGVjaWZpZWQ8L3NhbWw6QXV0aG5D%0D%0Ab250ZXh0Q2xhc3NSZWY+PC9zYW1sOkF1dGhuQ29udGV4dD48L3NhbWw6QXV0%0D%0AaG5TdGF0ZW1lbnQ+PHNhbWw6QXR0cmlidXRlU3RhdGVtZW50IHhtbG5zOnhz%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSIgeG1sbnM6eHNp%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuRmVkZXJhdGVkSWRlbnRpZmll%0D%0AciI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmluZyI+%0D%0AYzQ2YTE5YzJjZjdkMjVkZTM0NTVjYmViNjhjNGM1ZWUwZGIyYTBhNDNhNzAy%0D%0ANDA1Nzk1OTYyMmMwZDViNjA2ZDwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3Nh%0D%0AbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkZpcnN0%0D%0ATmFtZSI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNpOnR5cGU9InhzOnN0cmlu%0D%0AZyI+U3VwcG9ydCBBZG1pbjwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6%0D%0AQXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkxhc3ROYW1l%0D%0AIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6c3RyaW5nIj5U%0D%0AZXN0aW5nPC9zYW1sOkF0dHJpYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+%0D%0APHNhbWw6QXR0cmlidXRlIE5hbWU9IlVzZXIuQWxpYXMiPjxzYW1sOkF0dHJp%0D%0AYnV0ZVZhbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPlN1cHBvcnQgQWRtaW4g%0D%0AVGVzdGluZzwvc2FtbDpBdHRyaWJ1dGVWYWx1ZT48L3NhbWw6QXR0cmlidXRl%0D%0APjxzYW1sOkF0dHJpYnV0ZSBOYW1lPSJVc2VyLkVtYWlsIi8+PHNhbWw6QXR0%0D%0AcmlidXRlIE5hbWU9IlVzZXIuVXNlcm5hbWUiPjxzYW1sOkF0dHJpYnV0ZVZh%0D%0AbHVlIHhzaTp0eXBlPSJ4czpzdHJpbmciPnN1cHBvcnRfYWRtaW48L3NhbWw6%0D%0AQXR0cmlidXRlVmFsdWU+PC9zYW1sOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1%0D%0AdGUgTmFtZT0iVXNlci5Mb2NhbGVTaWRLZXkiLz48c2FtbDpBdHRyaWJ1dGUg%0D%0ATmFtZT0iQ2FudmFzLlVzZXJJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWUgeHNp%0D%0AOnR5cGU9InhzOnN0cmluZyI+c3VwcG9ydF9hZG1pbjwvc2FtbDpBdHRyaWJ1%0D%0AdGVWYWx1ZT48L3NhbWw6QXR0cmlidXRlPjxzYW1sOkF0dHJpYnV0ZSBOYW1l%0D%0APSJDYW52YXMuUm9vdEFjY291bnRJRCI+PHNhbWw6QXR0cmlidXRlVmFsdWU+%0D%0AOTc1ODAwMDAwMDAwMDU2MTc8L3NhbWw6QXR0cmlidXRlVmFsdWU+PC9zYW1s%0D%0AOkF0dHJpYnV0ZT48c2FtbDpBdHRyaWJ1dGUgTmFtZT0iQ2FudmFzLlJvb3RB%0D%0AY2NvdW50VVJMIj48c2FtbDpBdHRyaWJ1dGVWYWx1ZSB4c2k6dHlwZT0ieHM6%0D%0Ac3RyaW5nIj5qb25ob3dhcmQuaW5zdHJ1Y3R1cmUuY29tPC9zYW1sOkF0dHJp%0D%0AYnV0ZVZhbHVlPjwvc2FtbDpBdHRyaWJ1dGU+PC9zYW1sOkF0dHJpYnV0ZVN0%0D%0AYXRlbWVudD48L3NhbWw6QXNzZXJ0aW9uPjwvc2FtbHA6UmVzcG9uc2U+Cg==%0D%0A",
//     "federatedID": ""
//   }];
  
//   // Get the Federated ID for the array elements
//   var samlResponseArray = await getFederatedID(samlResponseArray);
  
//   // For display purposes below, chop the samlResponse down to 20 chars. We wouldn't do this is real life
//   for (var i=0;i<samlResponseArray.length;i++) {
//     samlResponseArray[i].samlResponse = samlResponseArray[i].samlResponse.substring(0,19) + " (truncated for testing)";
//   }
  
//   if (Array.isArray(samlResponseArray) == true) {
//     console.log("getFederatedID Test Successful. samlResponseArray: ");
//     console.log(JSON.stringify(samlResponseArray,null,'\t'));
//   } else {
//     console.log("getFederatedID Test Unsuccessful. Nothing returned. Check the console for a possible error.");
//   }
// })();

// Export function
module.exports ={
  getFederatedID
}