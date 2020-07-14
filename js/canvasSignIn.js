const removeLogins = require("./removeLogins");
const { Builder, Key, By, until } = require('selenium-webdriver');

module.exports =
    function canvasSignIn(user, instance, cb) {
        console.log("canvasSignIn -> user", user);
        describe('Login and pull Cases ID', function () {
            var driver;

            before(async function () {
                driver = await new Builder().forBrowser('chrome').build();
            });

            console.log("made it");
            it('Pull up Canvas instance ', async function () {
                await driver.get(`https://${user.domain}/login/canvas`);
                await driver.wait(until.elementLocated(By.className('ic-Input text')), 100000);
                await driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(user.uniqueLogin);
                await driver.findElement(By.id('pseudonym_session_password').sendKeys(user.password));
                await driver.findElement(By.css("button[class='ic-Form-control ic-Form-control--login']")).click();
                await driver.wait(until.elementLocated(By.className('ic-Dashboard-header__title')), 100000);
                console.log("made it");
                // await driver.get(`http://adminconsole.canvaslms.com`);
            });
            // removeLogins(user, instance);
        });
        // cb();
    }

    