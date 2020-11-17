const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');

module.exports =
    function createUser(user, instance) {
        let username;
        let unique_id;
        let password = randomString();
        if (!user.full_name) {
            username = user.email
        } else {
            username = user.full_name
        }
        if (!user.login_id) {
            unique_id = user.email
        } else {
            unique_id = user.login_id
        }
        user.unique_id = unique_id;
        user.password = password;
        let params = {
            user: {
                name: username,
                skip_registration: true,
            },
            communication_channel: {
                address: user.email
            },
            pseudonym: {
                send_confirmation: true,
                unique_id: unique_id,
                password: password
            }
        };
        instance.post(`accounts/self/users`, params)
            .then(async function (response) {
                console.log(`${username} user account created`);
                user.id = response.data.id;
                // if (user.account_admin.toLowerCase() === "false" || user.account_admin.toLowerCase() === "f") {
                //     console.log("Not setting up as account admin");
                // } else {
                //     setupAdmin(response.data.id, instance)
                // }
                // // user.loginInfo.removeLogin = false;
                // user.loginInfo = response.data;
                // if (user.field_admin.toLowerCase() === "false" || user.field_admin.toLowerCase() === "f") {
                //     console.log(`Not creating as field admin`);
                // } else {
                //     // Get SAML response
                //     var samlResponse = await getSAMLResponse.getSAMLResponse(user);
                //     if (samlResponse != "") {
                //         console.log("getSAMLResponse Test Successful. First 50 characters of SAMLResponse:" + samlResponse.substring(0, 49));
                //         //console.log("Unit Test Successful. Complete SAMLResponse (URI Encoded):");
                //         //console.log(encodeURI(samlResponse));
                //     } else {
                //         console.log("getSAMLResponse Test Unsuccessful. Nothing returned. Check the console for a possible error.");
                //     }
                // }
            })
            .catch(function (error) {
                console.log(error);
            });
    }