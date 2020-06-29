const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');

module.exports = 
function createUser(user, instance, canvasSignin) {
    let username;
    let unique_id;
    let password = randomString();
    if (!user.fullName) {
        username = user.email
    } else {
        username = user.fullName
    }
    if (!user.login_id) {
        unique_id = user.email
    } else {
        unique_id = user.login_id
    }
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
            if (user.accountAdmin) {
                setupAdmin(response.data.id, instance)
            }
            response.data.password = password;
            user.loginInfo = response.data;
            if (!user.fieldAdmin) {
                console.log(`Not creating as field admin`);
            } else {
                canvasSignin(user, instance);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
}