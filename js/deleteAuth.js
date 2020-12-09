module.exports =
    function deleteAuth(authArray) {
        authArray.forEach(user => {
            user.instance.get(`/accounts/self/authentication_providers`)
                .then(res => {
                    res.data.forEach(auth => {
                        if (auth.log_in_url === "feel_free_to_delete") { 
                            user.instance.delete(`/accounts/self/authentication_providers/${auth.id}`)
                            .then((result) => {
                                console.log(`Successfully deleted created auth from ${user.domain}`);
                            }).catch((err) => {
                                console.log("Auth is cleared");
                            })
                        }
                    });
                })
        });
    }