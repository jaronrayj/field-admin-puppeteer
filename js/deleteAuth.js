module.exports =
    function deleteAuth(authArray) {
        authArray.forEach(user => {
            user.instance.get(`/accounts/self/authentication_providers`)
                .then(res => {
                    res.data.forEach(auth => {
                        if (auth.certificate_fingerprint === "feel_free_to_delete") { 
                            user.instance.delete(`/accounts/self/authentication_providers/${auth.id}`)
                            .then((result) => {
                                console.log(`Successfully deleted extra auth from ${user.domain}/accounts/self/authentication_providers`);
                            }).catch((err) => {
                                console.log("Verified extra saml is cleared");
                            })
                        }
                    });
                })
        });
    }