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
            })
            .catch(function (error) {
                console.log(error);
            });
    }