const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');

module.exports =
    function createUser(user, instance, canvasSignin) {
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
        user.uniqueLogin = unique_id;
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
            .then(function (response) {
                console.log(`${username} created`);
                if (user.account_admin.toLowerCase() === "false" || user.account_admin.toLowerCase() === "f") {
                    console.log("Not setting up as account admin");
                } else {
                    setupAdmin(response.data.id, instance)
                }
                // user.loginInfo.removeLogin = false;
                user.loginInfo = response.data;
                if (!user.field_admin) {
                    console.log(`Not creating as field admin`);
                } else {
                    // todo get this functional to add field admins
                    // canvasSignin(user, instance);
                }
            })
            .catch(function (error) {
                console.log(error);
            });
    }