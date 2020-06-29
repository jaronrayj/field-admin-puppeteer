const removeLogins = require("./removeLogins");

module.exports = 
function canvasSignIn(logins, instance, cb) {
    console.log("canvasSignIn -> logins", logins);
    // removeLogins(logins, instance);
    return console.log("made it");
    describe('Login and pull Cases ID', function () {
        let driver;

        before(async function () {
            driver = await new Builder().forBrowser('chrome').build();
        });

        it('Pull up Salesforce ', async function () {
            await driver.get('');
        });
    });
    cb();
}