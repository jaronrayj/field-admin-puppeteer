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
const addSamlAuth = require('./js/addSamlAuth');
const deleteAuth = require('./js/deleteAuth');

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
const authRemoval = [];

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
                        user.password = randomString()
                        user.instance = instance;

                        // Checking to see if they have a saml auth and creating one that will be deleted later if not present
                        user.instance.get('/accounts/self/authentication_providers')
                            .then(res => {
                                let haveSaml = false
                                res.data.forEach(auth => {
                                    if (auth.auth_type === 'saml') {
                                        haveSaml = true;
                                    }
                                });
                                if (!haveSaml) {
                                    addSamlAuth(user);
                                }
                            })

                        // Search for the user by login id
                        user.instance.get(`/accounts/self/users?search_term=${user.unique_id}&include[]=email`)
                            .then(async res => {
                                user.multipleAccounts = false;
                                if (res.data.length === 0) {
                                    // User doesn't exist, creating
                                    createUser(user);
                                    userBank.push(user);
                                } else {
                                    console.log(`${user.email}'s account exists`);
                                    if (res.data.length > 1) {
                                        console.log(`${user.email} has multiple accounts, setting up ${res.data.length} accounts for them`);
                                        user.multipleAccounts = true;
                                    }
                                    res.data.forEach(canvasUser => {
                                        // Creating new user so to not overwrite previous array data
                                        const newUser = {
                                            email: user.email,
                                            domain: user.domain,
                                            password: user.password,
                                            instance: user.instance,
                                            multipleAccounts: user.multipleAccounts,
                                            account_admin: user.account_admin,
                                            sf_url: user.sf_url
                                        }
                                        if (user.account_admin) {
                                            // Unless says "false" or "f" will set up as account_admin or if have multiple accounts and cannot verify
                                            if (user.account_admin.toLowerCase() === "false" && !user.multipleAccounts) {
                                                console.log(`Not setting up ${user.unique_id} as an account admin, or multiple user accounts.`);
                                            } else {
                                                setupAdmin(canvasUser.id, newUser)
                                            }
                                        } else {
                                            setupAdmin(canvasUser.id, newUser)
                                        }
                                        // Setting up a new login for the user to return to sign in as user to get federated ID.
                                        let num = Math.floor(Math.random() * 5000)
                                        newUser.unique_id = `fieldadminsetup_removeme${num}`;
                                        newUser.id = canvasUser.id;
                                        // Create a login that will be deleted later
                                        createLogin(newUser);
                                        userBank.push(newUser);
                                    });
                                    count += 1;
                                    if (jsonObj.length === count) {
                                        fs.writeFile('supportAdmins.json', JSON.stringify(userBank, null, 2), function (err) {
                                            if (err) return console.log(err);
                                            console.log('written to json here: supportAdmins.json');
                                        });
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
            .then(samlResponse => {
                user.samlResponseEncoded = samlResponse
                console.log(`Got SAML for ${user.email}`)
                resolve(user)
            });
    });
}
// todo running fed id process before saml finishes

function samlAndFedId(userBank) {
    var samlResults = []
    var getSamlResponses = new Promise(resolve => {
        asyncForEach(userBank, async function (user) {
            await getSamlOneByOne(user).then(function (result) {
                samlResults.push(result)
            })
            if (samlResults.length === userBank.length) {
                // remove password field from JSON for security
                userBank.forEach(user => {
                    delete user.password;
                });
                removeLogins(userBank);
                deleteAuth(userBank);
                return resolve(samlResults)
            }
        });
    })
    getSamlResponses.then(results => {
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