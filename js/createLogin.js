const randomString = require('../util/randomString');
// const getSAMLResponse = require('../js/getSAMLResponse');

module.exports =
    async function createLogin(user, instance) {
        let password = randomString();
        user.password = password;

        instance.post(`/accounts/self/logins`, {
                user: {
                    id: user.canvas[0].id,
                },
                login: {
                    unique_id: user.unique_id,
                    password: password
                }
            }).then(async function (response) {
                user.loginInfo = response.data;
                console.log("inside function", user)
            })
            .catch(function (error) {
                console.log(error);
            });
        return user;
    }