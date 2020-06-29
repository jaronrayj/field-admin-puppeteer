const removeLogins = require("./removeLogins");

module.exports = 
function canvasSignIn(user, instance, cb) {
    console.log("canvasSignIn -> user", user);
    removeLogins(user, instance);
    return console.log("made it");
    describe('Login and pull Cases ID', function () {
        let driver;

        before(async function () {
            driver = await new Builder().forBrowser('chrome').build();
        });

        it('Pull up Canvas instance ', async function () {
            await driver.get('');
        });
    });
    cb();
}