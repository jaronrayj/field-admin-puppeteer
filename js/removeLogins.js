// Insert array of logins
module.exports =
    function removeLogins(user, instance, cb) {
        // arr.forEach(login => {
        console.log("removeLogins -> login", user);
        instance.delete(`/users/${user.loginInfo.user_id}/logins/${login.loginInfo.id}`)
            .then(console.log(`Login for ${user.loginInfo.unique_id} deleted`))
            .catch(err => console.log(err));
        instance.get(`/accounts/self/users?search_term=fieldadminsetup4`)
            .then(response =>{
                if (response[0]) {
                    console.log(`Login still valid, need to manually remove for ${user.email}`);
                } else {
                    console.log("Verified new login removed");
                }
            })
    }