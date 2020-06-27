require('dotenv').config()
require('chromedriver');

const axios = require('axios');
const fs = require('fs');
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
const uniquePassword = 'superuniquepassword';

// Have this change based off of file imported
let canvasDomain = 'https://jjohnson.instructure.com/api/v1';
let userEmail = 'example@example.com'
let sfAccountId = '001A000001FmoXJIAZ'
let account_admin = true;
let field_admin = false;
let fullName = 'Field Admin';

// Changing variables
const toBeDeletedLogins = [];
const logins = [];

// api creds setup
const instance = axios.create({
    baseURL: canvasDomain,
    headers: { 'Authorization': `Bearer ${token}` }
});

// Run main process here
describe('Check Canvas accounts and create', function () {

    instance.get(`/accounts/self/users?search_term=${userEmail}`)
        .then(response => {
            if (response.data.length === 0) {
                createUser(userEmail);
            } else {
                // Create a login that will be deleted later
                createLoginOnly(response.data, userEmail, response.data[0].id);
            }
            console.log("Logins", logins);
        })

    // todo make sure the logins get put together before proceeding with next steps

    if (field_admin) {
        console.log("Finished admin/login creation, working field admins now");

        fieldAdminSetup(logins)

    }

})



function createUser(email) {
    let username
    if (!fullName) {
        username = email
    } else {
        username = fullName
    }
    let params = {
        user: {
            name: username,
            skip_registration: true,
        },
        communication_channel: {
            address: email
        },
        pseudonym: {
            send_confirmation: true,
            unique_id: email,
            password: uniquePassword
        }
    };
    instance.post(`accounts/self/users`, params)
        .then(function (response) {
            console.log(`${username} created`);
            if (account_admin) {
                setupAdmin(response.data.id)
            }
            logins.push(response.data)
        })
        .catch(function (error) {
            console.log(error);
        });
}

function createLoginOnly(data, email, id) {
    if (data.length = 1) {
        instance.post(`/accounts/self/logins`, {
            user: {
                id: id,
            },
            login: {
                unique_id: 'fieldadminsetup400',
                password: uniquePassword
            }
        }).then(function (response) {
            console.log(`${email} exists, created login`);
            response.data.domain = canvasDomain;
            toBeDeletedLogins.push(response.data);
            logins.push(response.data);
            if (account_admin) {
                setupAdmin(response.data.user_id)
            }
        })
            .catch(function (error) {
                console.log(error);
            });
    } else {
    }
}

function setupAdmin(id) {
    instance.post(`/accounts/self/admins`, {
        user_id: id
    }).then(
        console.log("Set up as admin")
    ).catch(err => console.log(err));
}

function removeLogins(arr) {
    arr.forEach(login => {
        axios({
            method: `delete`,
            url: `${login.domain}/users/${login.user_id}/logins/${login.id}`,
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(console.log(`Login for ${login.unique_id} deleted`))
            .catch(err => console.log(err));
    });
}


// Set up as Field Admin
function fieldAdminSetup() {

    describe('Login and pull Cases ID', function () {
        let driver;

        before(async function () {
            driver = await new Builder().forBrowser('chrome').build();
        });

        it('Pull up Salesforce ', async function () {
            await driver.get('');
        });
    });

}


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

setTimeout(() => {
    removeLogins(toBeDeletedLogins);
}, 3000);