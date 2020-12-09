const randomString = require('../util/randomString');

module.exports =
    async function createLogin(user) {

        user.instance.post(`/accounts/self/logins`, {
                user: {
                    id: user.id,
                },
                login: {
                    unique_id: user.unique_id,
                    password: user.password
                }
            }).then(async function (response) {
                console.log(`Login added for ${user.email}`);
            })
            .catch(function (error) {
                console.log(error);
            });
    }