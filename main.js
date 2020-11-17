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
const setupAdmin = require('./js/setupAdmin');

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

function main() {
createUserOrLogin()
}

function createUserOrLogin() {
    inq.prompt([{
            type: "list",
            message: "Which csv has the data you want to upload?",
            choices: jsonLocation,
            name: "jsonFile"
        }])
        .then(inqRes => {

            csv2json()
                .fromFile(`./csv-storage/${inqRes.jsonFile}`)
                .then((jsonObj) => {
                    jsonObj.forEach(user => {
                        // api creds setup
                        user.deleteLogin = false;
                        instance = axios.create({
                            baseURL: `https://${user.domain}/api/v1`,
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        let search;
                        if (user.login_id) {
                            search = user.login_id
                        } else {
                            search = user.email
                        }

                        instance.get(`/accounts/self/users?search_term=${search}&include[]=email`)
                            .then(async response => {
                                if (response.data.length === 0) {
                                    // User doesn't exist, creating
                                    createUser(user, instance);
                                } else if (response.data.length === 1 && response.data[0].email === user.email) {
                                    // Check if the one user that exists has the same email to verify
                                    console.log(`${user.email}'s account exists`);
                                    if (user.account_admin.toLowerCase() === "true" || user.account_admin.toLowerCase() === "t") {
                                        setupAdmin(response.data[0].id, instance)
                                    } else {
                                        console.log(`Not setting up ${user.email} as an account admin`);
                                    }
                                    if (user.field_admin.toLowerCase() === "true" || user.field_admin.toLowerCase() === "t") {
                                        let num = Math.floor(Math.random() * 500)
                                        user.unique_id = `fieldadminsetup_removeme${num}`;
                                        user.id = response.data.id;
                                        user.canvas = response.data;
                                        // Create a login that will be deleted later
                                        user = await createLogin(user, instance);
                                        user.deleteLogin = true;
                                        console.log("outside function", user)
                                        // var samlResponse = await getSAMLResponse.getSAMLResponse(user);
                                        // if (samlResponse != "") {
                                        //     console.log("getSAMLResponse Test Successful. First 50 characters of SAMLResponse:" + samlResponse.substring(0, 49));
                                        //     //console.log("Unit Test Successful. Complete SAMLResponse (URI Encoded):");
                                        //     //console.log(encodeURI(samlResponse));
                                        // } else {
                                        //     console.log("getSAMLResponse Test Unsuccessful. Nothing returned. Check the console for a possible error.");
                                        // }
                                    } else {
                                        console.log(`Not setting up ${user.email} as a field admin`);
                                    }
                                } else {
                                    // More than one users and email did not match not changing the users
                                    console.log(`Could not verify correct user for ${user.email}`);
                                }

                                // Todo Verification if more than 1 user
                                // for (let i = 0; i < response.data.length; i++) {
                                // const returnUser = response.data[i];
                                // }
                            })
                    })
                })

        });
}

main();