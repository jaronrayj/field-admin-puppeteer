const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');
module.exports =
    async function createLoginOnly(data, row, instance, cb) {
        let password = randomString();
        if (data.length = 1 && data[0].login_id === row.email) {
            instance.post(`/accounts/self/logins`, {
                user: {
                    id: data[0].id,
                },
                login: {
                    unique_id: 'fieldadminsetup400',
                    password: randomString()
                }
            }).then(function (response) {
                console.log(`${row.email} exists, created login`);
                if (row.account_admin) {
                    setupAdmin(response.data.user_id, instance)
                }
                console.log("createLoginOnly -> response.data", response.data);
                return response.data;
            })
                .catch(function (error) {
                    console.log(error);
                });
        } else {
            console.log(`Could not verify correct user for ${row.email}`);
            return null;
        }
    }