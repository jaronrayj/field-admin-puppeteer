const {
    default: Axios
} = require("axios");

// Delete all relevant logins for each user domain
const token = process.env.TOKEN;
const axios = require('axios');
const axiosThrottle = require('axios-throttle');
axiosThrottle.init(axios, 200);

module.exports =
    function removeLogins(userBank) {
        userBank.forEach(user => {
            instance = axios.create({
                baseURL: `https://${user.domain}/api/v1`,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // Search any users with "fieldadminsetup_removeme"
            instance.get(`/accounts/self/users?search_term=fieldadminsetup_removeme`)
                .then(response => {

                    if (response.data.length > 0) {
                        response.data.forEach(user => {
                            // Get that specific users logins
                            instance.get(`/users/${user.id}/logins`)
                                .then(response => {
                                    // Select any correct ones
                                    response.data.forEach(login => {
                                        if (login.unique_id.includes("fieldadminsetup_removeme")) {
                                            // Delete the correct login from user
                                            try {
                                                instance.delete(`/users/${login.user_id}/logins/${login.id}`)
                                                    .then(console.log(`Login deleted`))
                                                    .catch(err => console.log("Login's cleared"));
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