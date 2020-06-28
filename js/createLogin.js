const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');
module.exports =
    async function createLoginOnly(data, row, instance, cb) {
        let password = randomString();

        instance.post(`/accounts/self/logins`, {
            user: {
                id: data[0].id,
            },
            login: {
                unique_id: 'fieldadminsetup400',
                password: password
            }
        }).then(function (response) {
            console.log(`${row.email} exists, created login`);
            if (row.account_admin) {
                setupAdmin(response.data.user_id, instance)
            }
            console.log("createLoginOnly -> response.data", response.data);
            response.data.password = password;
            response.data.removeLogin = true;
            row.loginInfo = response.data;
            cb(row, instance);
        })
            .catch(function (error) {
                console.log(error);
            });
    }