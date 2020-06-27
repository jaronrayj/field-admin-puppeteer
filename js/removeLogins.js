const axios = require('axios');

module.exports= 
function removeLogins(arr, token) {
    arr.forEach(login => {
    console.log("removeLogins -> login", login);
        axios({
            method: `delete`,
            url: `https://${login.canvasDomain}/users/${login.created.user_id}/logins/${login.created.id}`,
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(console.log(`Login for ${login.unique_id} deleted`))
            .catch(err => console.log(err));
    });
}