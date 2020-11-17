// Insert array of logins
module.exports =
    function removeLogins(user, instance, cb) {
        // arr.forEach(login => {
        console.log("removeLogins -> login", user);
        instance.delete(`/users/${user.loginInfo.user_id}/logins/${user.loginInfo.id}`)
            .then(console.log(`Login for ${user.email} should be deleted`))
            .catch(err => console.log(err));
        instance.get(`/accounts/self/users?search_term=fieldadminsetup_removeme`)
            .then(response => {
                if (response.data[0]) {
                    console.log(`Login still valid, may need to remove logins for ${user.domain}`);
                } else {
                    console.log(`Verified logins removed for ${user.domain}`);
                }
            })
    }