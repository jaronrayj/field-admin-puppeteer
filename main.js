require('dotenv').config()
require('chromedriver');
const { Builder, Key, By, until } = require('selenium-webdriver');

describe('Set up clever accounts', function () {
  let driver;

  before(async function () {
    driver = await new Builder().forBrowser('chrome').build();
  });

  const oktausername = process.env.OKTALOGIN
  const oktapassword = process.env.OKTAPASSWORD

  it('Pull up Salesforce ', async function () {
    await driver.get('https://instructure.lightning.force.com/lightning/page/home');
    await driver.wait(until.elementLocated(By.id('idp_hint_section')), 100000);
    await driver.findElement(By.css("button[class='button mb24 secondary wide']")).click();
    await driver.wait(until.elementLocated(By.id('okta-signin-username')), 100000);
    await driver.findElement(By.id('okta-signin-username')).sendKeys(oktausername);
    await driver.findElement(By.id('okta-signin-password')).sendKeys(oktapassword, Key.RETURN);
    await driver.wait(until.elementLocated(By.className('margin-btm-0 o-form-input-name-autoPush')), 100000);
    await driver.findElement(By.css("input[value='Send Push']")).click();
    await driver.wait(until.elementLocated(By.className('slds-button slds-button_neutral search-button')), 100000);
    
  });



//   after(() => driver && driver.quit());

})