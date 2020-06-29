const randomString = require('../util/randomString');
const setupAdmin = require('../js/setupAdmin');
module.exports =
    async function createLoginOnly(user, instance, canvasSignin) {
        console.log("createLoginOnly -> user", user);
        let password = randomString();
        user.password = password;

        instance.post(`/accounts/self/logins`, {
            user: {
                id: user.canvas[0].id,
            },
            login: {
                unique_id: user.uniqueLogin,
                password: password
            }
        }).then(function (response) {
            console.log(`${user.email} exists, created login`);
            if (user.accountAdmin) {
                setupAdmin(response.data.user_id, instance)
            }
            console.log("createLoginOnly -> response.data", response.data);
            response.data.removeLogin = true;
            user.loginInfo = response.data;
            canvasSignin(user, instance);
        })
            .catch(function (error) {
                console.log(error);
            });
    }