require('dotenv').config()
// require('chromedriver');

const {
    Builder,
    Key,
    By,
    until
} = require('selenium-webdriver');
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
    inq.prompt([{
            type: "list",
            message: "Which csv has the data you want to upload?",
            choices: jsonLocation,
            name: "jsonFile"
        }])
        .then(async inqRes => {

            csv2json()
                .fromFile(`./csv-storage/${inqRes.jsonFile}`)
                .then(jsonObj => {
                    let count = 0;
                    jsonObj.forEach(user => {
                        // api creds setup
                        user.deleteLogin = false;
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

                        // Search for the user by login id
                        instance.get(`/accounts/self/users?search_term=${user.unique_id}&include[]=email`)
                            .then(async response => {
                                if (response.data.length === 0) {
                                    // User doesn't exist, creating
                                    createUser(user, instance);
                                    userBank.push(user);
                                } else if (response.data.length === 1 && response.data[0].email === user.email) {
                                    // Check if the one user that exists has the same email to verify
                                    console.log(`${user.unique_id}'s account exists`);
                                    if (!user.account_admin || user.account_admin.toLowerCase() !== "false" || user.account_admin.toLowerCase() !== "f") {
                                        setupAdmin(response.data[0].id, instance)
                                    } else {
                                        console.log(`Not setting up ${user.unique_id} as an account admin`);
                                    }
                                    if (!user.field_admin || user.field_admin.toLowerCase() !== "false" || user.field_admin.toLowerCase() !== "f") {
                                        let num = Math.floor(Math.random() * 5000)
                                        user.unique_id = `fieldadminsetup_removeme${num}`;
                                        user.id = response.data[0].id;
                                        // Create a login that will be deleted later
                                        user.deleteLogin = true;
                                        createLogin(user, instance);
                                        user.field_admin = true;
                                        userBank.push(user);
                                    } else {
                                        console.log(`Not setting up ${user.unique_id} as a field admin`);
                                    }
                                } else {
                                    // More than one users and email did not match not changing the users
                                    console.log(`Could not verify correct user for ${user.unique_id}`);
                                }
                                count += 1;
                                if (jsonObj.length === count) {
                                    resolve(userBank);
                                }
                            })
                    })
                })
        })
})

createUserOrLogin
    .then(users => {
        // Get SAML Responses back from adminconsole page
        samlAndFedId(users);
    })
    .catch(err => {
        console.log(err);
    })

async function asyncForEach(array, conditional, callback, ) {
    for (let i = 0; i < array.length; i++) {
        if (array[i][conditional]) {
            await callback(array[i], i, array);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSamlOneByOne(user) {
    return new Promise((resolve, reject) => {
        instance = axios.create({
            baseURL: `https://${user.domain}/api/v1`,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        getSAMLResponse(user.domain, user.unique_id, user.password)
            .then(function (samlResponse) {
                user.samlResponseEncoded = samlResponse
                console.log(`Got SAML for ${user.email}`)
                resolve(user)
            });

    });
}


function samlAndFedId(userBank) {
    var samlResults = []
    var getSamlResponses = new Promise(resolve => {
        asyncForEach(userBank, "field_admin", async function (user) {
            await getSamlOneByOne(user).then(function (result) {
                samlResults.push(result)
            })
            if (samlResults.length === userBank.length) {
                removeLogins(userBank);
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