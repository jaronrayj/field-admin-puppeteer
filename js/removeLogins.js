const {
    default: Axios
} = require("axios");

// Delete all relevant logins for each user domain

module.exports =
    function removeLogins(userBank) {
        userBank.forEach(user => {
            // Search any users with "fieldadminsetup_removeme"
            user.instance.get(`/accounts/self/users?search_term=fieldadminsetup_removeme`)
                .then(response => {
                    if (response.data.length > 0) {
                        response.data.forEach(canvasUser => {
                            // Get that specific users logins
                            user.instance.get(`/users/${canvasUser.id}/logins`)
                                .then(response => {
                                    // Select any correct ones
                                    response.data.forEach(login => {
                                        if (login.unique_id.includes("fieldadminsetup_removeme")) {
                                            // Delete the correct login from user
                                            try {
                                                user.instance.delete(`/users/${login.user_id}/logins/${login.id}`)
                                                    .then(console.log(`Login deleted`))
                                                    .catch(err => console.log(`Login's cleared`));
                                            } catch (error) {
                                                console.log("cleared");
                                            }
                                        }
                                    });
                                })
                                .catch(err => console.log(err));
                        })
                    } else {
                        console.log(`Verified logins removed for ${user.domain}`);
                    }
                })
                .catch(err => console.log(err));
            });
    }