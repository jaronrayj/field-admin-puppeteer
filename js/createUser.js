const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');

module.exports = 
function createUser(row, instance, fieldAdminSetup) {
    let username;
    let unique_id;
    let password = randomString();
    if (!row.fullName) {
        username = row.email
    } else {
        username = row.fullName
    }
    if (!row.login_id) {
        unique_id = row.email
    } else {
        unique_id = row.login_id
    }
    let params = {
        user: {
            name: username,
            skip_registration: true,
        },
        communication_channel: {
            address: row.email
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
            if (row.account_admin) {
                setupAdmin(response.data.id, instance)
            }
            response.data.password = password;
            row.loginInfo = response.data;
            if (!row.field_admin) {
                console.log(`Not creating as field admin`);
            } else {
                fieldAdminSetup(row, instance);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}