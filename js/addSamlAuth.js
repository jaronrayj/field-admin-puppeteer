module.exports = 
    function addSamlAuth (user){
        user.instance.post('/accounts/self/authentication_providers', {
            auth_type: "saml",
            idp_entity_id: "set_up_for_support_field_admin_purposes",
            log_in_url: "feel_free_to_delete",
            certificate_fingerprint: "irrelevant",
            identifier_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",  
        }).then(res =>{
            console.log(`Added temporary saml auth for ${user.domain}`);
            return res
        }).catch(err => {return err})
    }

