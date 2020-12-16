const setupAdmin = require("./setupAdmin");

module.exports =
    function createUser(user) {
        let username;
        if (!user.full_name) {
            username = user.email
        } else {
            username = user.full_name
        }
        let params = {
            user: {
                name: username,
                skip_registration: false,
            },
            communication_channel: {
                address: user.email
            },
            pseudonym: {
                send_confirmation: true,
                unique_id: user.unique_id,
                password: user.password
            }
        };
        user.instance.post(`/accounts/self/users`, params)
            .then(async function (response) {
                console.log(`${username} user account created`);
                if (user.account_admin) {
                    // Unless says "false" or "f" will set up as account_admin or if have multiple accounts and cannot verify
                    if (user.account_admin.toLowerCase() === "false") {
                        console.log(`Not setting up ${user.unique_id} as an account admin, or multiple user accounts.`);
                    } else {
                        setupAdmin(response.data.id, user)
                    }
                } else {
                    setupAdmin(response.data.id, user)
                }
            })
            .catch(function (error) {
                console.log(error);
            });
    }