require('dotenv').config()
require('chromedriver');
const axios = require('axios');


const fs = require('fs');
const parseJson = require('parse-json');
const jsonLocation = fs.readdirSync('./csv-pull');

const oktausername = process.env.OKTALOGIN
const oktapassword = process.env.OKTAPASSWORD
const token = process.env.TOKEN

const { Builder, Key, By, until } = require('selenium-webdriver');

describe('Canvas User account', function () {
    let driver;

    before(async function () {
        driver = await new Builder().forBrowser('chrome').build();
    });

    it('Pull up Salesforce ', async function () {
        await driver.get('https://instructure.lightning.force.com/lightning/page/home');
        await driver.wait(until.elementLocated(By.id('idp_hint_section')), 100000);
        await driver.findElement(By.css("button[class='button mb24 secondary wide']")).click();
        await driver.wait(until.elementLocated(By.id('okta-signin-username')), 100000);
        await driver.findElement(By.id('okta-signin-username')).sendKeys(oktausername);
        await driver.findElement(By.id('okta-signin-password')).sendKeys(oktapassword, Key.RETURN);
        await driver.wait(until.elementLocated(By.className('margin-btm-0 o-form-input-name-autoPush')), 100000);
        await driver.findElement(By.css("input[value='Send Push']")).click();
        await driver.wait(until.elementLocated(By.className('slds-button slds-button_neutral search-button')), 100000);

    });

})

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
//     console.log("logged in");
// });

// selenium setup
// //   after(() => driver && driver.quit());

const instance = axios.create({
    baseURL: 'https://jjohnson.instructure.com/api/v1',
    timeout: 1000,
    headers: { 'Authorization': `Bearer ${token}` }
});

instance.get('/courses/8')
    .then(response => {
        console.log(response.data);
    })

