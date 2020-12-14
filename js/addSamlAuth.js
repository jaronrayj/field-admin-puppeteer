module.exports = 
    function addSamlAuth (user){
        user.instance.post('/accounts/self/authentication_providers', {
            auth_type: "saml",
            idp_entity_id: "",
            log_in_url: "",
            certificate_fingerprint: "feel_free_to_delete",
            identifier_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",  
        }).then(res =>{
            console.log(`Added temporary saml auth for ${user.domain}`);
            return res
        }).catch(err => {return err})
    }

