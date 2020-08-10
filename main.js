require('dotenv').config()
require('chromedriver');

const { Builder, Key, By, until } = require('selenium-webdriver');
const axios = require('axios');
const fs = require('fs');
const jsonLocation = fs.readdirSync('./csv-pull');
const { domain } = require('process');
const axiosThrottle = require('axios-throttle');
const createUser = require('./js/createUser');
const createLogin = require('./js/createLogin');
const parseJson = require('parse-json');
const canvasSignIn = require('./js/canvasSignIn');

//pass axios object and value of the delay between requests in ms
axiosThrottle.init(axios, 200)
// Variables
const oktausername = process.env.OKTALOGIN
const oktapassword = process.env.OKTAPASSWORD
const token = process.env.TOKEN

// Have this change based off of file imported
const csv = [{
    domain: 'jjohnson.instructure.com',
    email: 'example@example.com',
    sfAccountId: '001A000001FmoXJIAZ',
    accountAdmin: true,
    fieldAdmin: true,
    fullName: 'Field Admin',
}];


// Run main process here


csv.forEach(user => {
    // api creds setup
    instance = axios.create({
        baseURL: `https://${user.domain}/api/v1`,
        headers: { 'Authorization': `Bearer ${token}` }
    });

    instance.get(`/accounts/self/users?search_term=${user.email}&include[]=email`)
        .then(response => {
            if (response.data.length === 0) {
                // Create user with specified information
                createUser(user, instance, canvasSignIn);
            } else if (!user.fieldAdmin) {
                console.log(`${user.email} exists, not creating as field admin`);
            } else {
                for (let i = 0; i < response.data.length; i++) {
                    const returnUser = response.data[i];
                    if (response.length = 1 && returnUser.email === user.email) {
                        // Create a login that will be deleted later
                        let num = 400;
                        user.uniqueLogin = `fieldadminsetup${num}`;
                        num += 1;
                        user.canvas = response.data;
                        createLogin(user, instance, canvasSignIn);
                    } else {
                        console.log(`Could not verify correct user for ${user.email}`);
                    }
                }
            }
        })
})

// This is where it breaks....

// describe('Login and pull Cases ID', function () {
//     var driver;

//     before(async function () {
//         driver = await new Builder().forBrowser('chrome').build();
//     });

//     console.log("made it");
//     it('Pull up Canvas instance ', async function () {
//         await driver.get(`https://${user.domain}/login/canvas`);
//         await driver.wait(until.elementLocated(By.className('ic-Input text')), 100000);
//         await driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(user.uniqueLogin);
//         await driver.findElement(By.id('pseudonym_session_password').sendKeys(user.password));
//         await driver.findElement(By.css("button[class='ic-Form-control ic-Form-control--login']")).click();
//         await driver.wait(until.elementLocated(By.className('ic-Dashboard-header__title')), 100000);
//         console.log("made it");
//         // await driver.get(`http://adminconsole.canvaslms.com`);
//     });
//     // removeLogins(user, instance);
// });

// Set up as Field Admin

//  SF startup
//     it('Pull up Salesforce ', async function () {
//         await driver.get('https://instructure.lightning.force.com/lightning/page/home');
//         await driver.wait(until.elementLocated(By.id('idp_hint_section')), 100000);
//         await driver.findElement(By.css("button[class='button mb24 secondary wide']")).click();
//         await driver.wait(until.elementLocated(By.id('okta-signin-username')), 100000);
//         await driver.findElement(By.id('okta-signin-username')).sendKeys(oktausername);
//         await driver.findElement(By.id('okta-signin-password')).sendKeys(oktapassword, Key.RETURN);
//         await driver.wait(until.elementLocated(By.className('margin-btm-0 o-form-input-name-autoPush')), 100000);
//         await driver.findElement(By.css("input[value='Send Push']")).click();
//         await driver.wait(until.elementLocated(By.className('slds-button slds-button_neutral search-button')), 100000);

//     });

// })

// const jsforce = require('jsforce');
// let sfConnection = new jsforce.Connection();

// let securityToken;
// try {
//     securityToken = readUserData('.sfst');
// } catch (e) {
//     winston.debug(`Could not set security token: ${e}`);
//     securityToken = '';
// }

// sfConnection.login(username, password + securityToken).then(async () => {
// });

// selenium setup
// //   after(() => driver && driver.quit());