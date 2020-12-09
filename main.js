require('dotenv').config()
const axios = require('axios');
const fs = require('fs');
// const { domain } = require('process');
const axiosThrottle = require('axios-throttle');
const createUser = require('./js/createUser');
const createLogin = require('./js/createLogin');
const csv2json = require('csvtojson');
const inq = require('inquirer');
const getSAMLResponse = require('./js/getSAMLResponse');
const getFed = require('./js/getFedId-headless');
const setupAdmin = require('./js/setupAdmin');
const randomString = require('./util/randomString');
const removeLogins = require('./js/removeLogins');

//pass axios object and value of the delay between requests in ms
axiosThrottle.init(axios, 200)
// Variables
const oktausername = process.env.OKTALOGIN
const oktapassword = process.env.OKTAPASSWORD
const token = process.env.TOKEN

if (token === undefined) {
    console.log("Set up your .env by following the README to continue");
    return process.exit();
}

// Have this change based off of file imported
// const csv = [{
//     domain: 'jjohnson.instructure.com',
//     email: 'example@example.com',
//     sf_id: '001A000001FmoXJIAZ',
//     account_admin: true,
//     field_admin: true,
//     full_name: 'Field Admin',
//     login_id: "jjohsonfahi",
// }];

const jsonLocation = fs.readdirSync('./csv-storage')
// Where all of the users will be stored
const userBank = [];

let createUserOrLogin = new Promise((resolve, reject) => {
    // Through node asks what file to run through
    inq.prompt([{
            type: "list",
            message: "Which csv has the data you want to upload?",
            choices: jsonLocation,
            name: "jsonFile"
        }])
        .then(async inqRes => {

            csv2json()
                // From selected file will start running process
                .fromFile(`./csv-storage/${inqRes.jsonFile}`)
                .then(jsonObj => {
                    let count = 0;
                    jsonObj.forEach(user => {
                        // api creds setup
                        instance = axios.create({
                            baseURL: `https://${user.domain}/api/v1`,
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        // Using either the login provided or the email provided
                        if (user.login_id) {
                            user.unique_id = user.login_id
                        } else if (user.email) {
                            user.unique_id = user.email
                        } else {
                            console.log("missing email or login_id for user, not creating.");
                        }
                        let password = randomString();
                        user.password = password;
                        user.instance = instance;

                        // todo struggling with no saml page, either get it to work with firefox or create saml auth to be deleted later
                        // todo keep array of saml configs to remove? check in auth settings first if it exists

                        // Search for the user by login id
                        user.instance.get(`/accounts/self/users?search_term=${user.unique_id}&include[]=email`)
                            .then(async response => {
                                user.multipleAccounts = false;
                                if (response.data.length === 0) {
                                    // User doesn't exist, creating
                                    createUser(user);
                                    userBank.push(user);
                                } else {
                                    if (response.data.length > 1) {
                                        console.log(`${user.email} has multiple accounts, setting up ${response.data.length} accounts for them`);
                                        user.multipleAccounts = true;
                                    }
                                    response.data.forEach(canvasUser => {
                                        // Check if the one user that exists has the same email to verify
                                        console.log(`${user.email}'s account exists`);

                                        // toLowercase fails if left blank, checking that first, left blank will be set up
                                        if (user.account_admin) {
                                            if (user.account_admin.toLowerCase() !== "false" || user.account_admin.toLowerCase() !== "f" || !user.multipleAccounts) {
                                                // Unless says "false" or "f" will set up as account_admin or if have multiple accounts and cannot verify
                                                setupAdmin(canvasUser.id, user)
                                            } else {
                                                console.log(`Not setting up ${user.unique_id} as an account admin`);
                                            }
                                        } else {
                                            setupAdmin(canvasUser.id, user)
                                        }
                                        // toLowercase fails if left blank, checking that first, left blank will be set up
                                        if (user.field_admin) {
                                            if (user.field_admin.toLowerCase() !== "false" || user.field_admin.toLowerCase() !== "f") {
                                                // Unless says "false" or "f" will process to get federation ID
                                                let num = Math.floor(Math.random() * 5000)
                                                user.unique_id = `fieldadminsetup_removeme${num}`;
                                                user.id = canvasUser.id;
                                                // Create a login that will be deleted later
                                                createLogin(user);
                                                userBank.push(user);
                                            } else {
                                                console.log(`Not setting up ${user.unique_id} as a field admin`);
                                            }
                                        } else {
                                            let num = Math.floor(Math.random() * 5000)
                                            user.unique_id = `fieldadminsetup_removeme${num}`;
                                            user.id = canvasUser.id;
                                            // Create a login that will be deleted later
                                            createLogin(user);
                                            userBank.push(user);
                                        }
                                    });
                                    count += 1;
                                    if (jsonObj.length === count) {
                                        resolve(userBank);
                                    }
                                }
                            })
                    })
                })
        })
})

createUserOrLogin
    .then(userBank => {
        // Get SAML Responses back from adminconsole page
        samlAndFedId(userBank);
    })
    .catch(err => {
        console.log(err);
    })

async function asyncForEach(array, callback) {
    for (let i = 0; i < array.length; i++) {
        await callback(array[i], i, array);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSamlOneByOne(user) {
    return new Promise((resolve, reject) => {
            getSAMLResponse(user.domain, user.unique_id, user.password)
                .then(function (samlResponse) {
                    user.samlResponseEncoded = samlResponse
                    // remove password field from JSON for security
                    delete user.password;
                    console.log(`Got SAML for ${user.email}`)
                    resolve(user)
                });
    });
}


function samlAndFedId(userBank) {
    var samlResults = []
    var getSamlResponses = new Promise(resolve => {
        asyncForEach(userBank, async function (user) {
            await getSamlOneByOne(user).then(function (result) {
                samlResults.push(result)
            })
            // todo fix this to be more accurate since more than one user may process
            if (samlResults.length === userBank.length) {
                removeLogins(userBank);
                return resolve(samlResults)
            }
        });
    })
    getSamlResponses.then(results => {
        console.log("Triple checked that all extra logins removed^");
        // Get federated id from Salesforce
        getFed(results).then(function (res) {
            // Write results to json file in same directory
            fs.writeFile('supportAdmins.json', JSON.stringify(res, null, 2), function (err) {
                if (err) return console.log(err);
                console.log('written to json here: supportAdmins.json');
            });
        })
    });
};