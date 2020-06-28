// Insert array of logins
module.exports =
    function removeLogins(row, instance, cb) {
        // arr.forEach(login => {
        console.log("removeLogins -> login", row);
        instance.delete(`/users/${row.loginInfo.user_id}/logins/${login.loginInfo.id}`)
            .then(console.log(`Login for ${row.loginInfo.unique_id} deleted`))
            .catch(err => console.log(err));
        instance.get(`/accounts/self/users?search_term=fieldadminsetup4`)
            .then(response =>{
                if (response[0]) {
                    console.log(`Login still valid, need to manually remove for ${row.email}`);
                } else {
                    console.log("Verified new login removed");
                }
            })
    }