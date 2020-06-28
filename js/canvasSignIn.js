module.exports = 
function canvasSignIn(logins, cb) {

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