module.exports =
function setupAdmin(id, user) {
    user.instance.post(`/accounts/self/admins`, {
        user_id: id
    }).then(
        console.log("Set up as admin")
    ).catch(err => console.log(err));
}