require('dotenv').config()
require('chromedriver');


const axios = require('axios');
const fs = require('fs');
const createUser = require('./js/createUser');
const createLogin = require('./js/createLogin');
const removeLogins = require('./js/removeLogins');
const parseJson = require('parse-json');
const jsonLocation = fs.readdirSync('./csv-pull');
const { Builder, Key, By, until } = require('selenium-webdriver');
const { domain } = require('process');
const axiosThrottle = require('axios-throttle');
//pass axios object and value of the delay between requests in ms
axiosThrottle.init(axios, 200)

// Variables
const oktausername = process.env.OKTALOGIN
const oktapassword = process.env.OKTAPASSWORD
const token = process.env.TOKEN
// todo randomize this and store it for each user

// Have this change based off of file imported
const csv = [{
    canvasDomain: 'jjohnson.instructure.com',
    email: 'example@example.com',
    sfAccountId: '001A000001FmoXJIAZ',
    account_admin: true,
    field_admin: false,
    fullName: 'Field Admin',
}];


// Changing variables
const toBeDeletedLogins = [];
const logins = [];


// Run main process here
describe('Check Canvas accounts and create', function () {
    csv.forEach(row => {
        // api creds setup
        const instance = axios.create({
            baseURL: `https://${row.canvasDomain}/api/v1`,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        instance.get(`/accounts/self/users?search_term=${row.email}&include[]=email`)
            .then( response => {
                if (response.data.length === 0) {
                    row.created = createUser(row, instance);
                } else {
                    for (let i = 0; i < response.data.length; i++) {
                        const user = response.data[i];
                        if (user.email === row.email) {
                            // Create a login that will be deleted later
                            // todo tripping over itself, not waiting for this to finalize before moving on.
                            let newLogin =  createLogin(response.data, row, instance);
                            toBeDeletedLogins.push(newLogin);
                            row.created = newLogin;
                        }
                    }
                }
            })

        // todo make sure the logins get put together before proceeding with next steps
        if (row.field_admin) {
            console.log("Finished admin/login creation, working field admin now");
            fieldAdminSetup(logins)
        }
    })
    setTimeout(() => {
        removeLogins(toBeDeletedLogins, token);
    }, 5000);

})


// Set up as Field Admin
function fieldAdminSetup(cb) {

    describe('Login and pull Cases ID', function () {
        let driver;

        before(async function () {
            driver = await new Builder().forBrowser('chrome').build();
        });

        it('Pull up Salesforce ', async function () {
            await driver.get('');
        });
    });
    cb();
}

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