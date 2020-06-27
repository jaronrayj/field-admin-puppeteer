# field-admin-selenium

This will run with Canvas apis and selenium to create users in Canvas, or add a login to their account and go through the field admin adding process. Your Salesforce token needs to be allowed to set up field admins for this to function.

## Prereqs
### One Time
### Clone and Install
Move to directory location of choice and:
```
$ git clone git@github.com:jaronrayj/field-admin-selenium.git
$ npm install
```
or
```
$ yarn install
```
#### .env file setup
Create a file at the root level named ".env". add the capitalized words and ='s and add in your information.

* OKTALOGIN=oktausername
* OKTAPASSWORD=oktapassword
* TOKEN=CanvasToken(no Bearer)

### CSV file structure (in no specific order)

Required fields -
* email - User email
* domain - Canvas domain (ex. domain.instructure.com)

Optional fields -
* full_name - User's full name to create account
* login_id - User's login_id (default is email above)
* sf_id - Salesforce Account ID (required for Field Admin setup)
    - ex. https://instructure.lightning.force.com/lightning/r/Account/001A000001FmoXJIAZ/view
    - ID = 001A000001FmoXJIAZ
* field_admin - boolean, set true to enable as field admin (default is true)
* account_admin - boolean, set true to enable as account admin (default is true)

### Sample file

```
email,domain,full_name,login_id,sf_id,field_admin,account_admin
example@example.com,domain.instructure.com,Jaron Johnson,jjohnson,001A000001FmoXJIAZ,TRUE,TRUE
example2@example.com,domain.instructure.com,Not Jaron,,001A000001FmoXJIAZ,FALSE,TRUE
example3@example.com,domain.instructure.com,,jokes,001A000001FmoXJIAZ,TRUE,FALSE
```