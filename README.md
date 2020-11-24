# field-admin-puppeteer
**PLEASE READ ALL**

This will run with Canvas apis and puppeteer to create users in Canvas, or add a login to their account and go through the field admin adding process. Your Salesforce token needs to be allowed to set up field admins for this to function.

It does require you to have push notifications turned on for Okta
Verify as well, midway through it will ask you to accept that it's you trying to sign in.

This process _should_ also send the welcome email to the new admins and ask that they set up a password for the first time.

## Prereqs
### One Time - Clone and Install and .env file setup
Move to directory location of choice and:
```
$ git clone git@github.com:jaronrayj/field-admin-puppeteer.git
```
```
$ npm install
```
or
```
$ yarn install
```
Create a file at the root level (in the folder field_admin_puppeteer) named ".env". add (minus "[]"):

* OKTA_USERNAME=[put your okta username here]
* OKTA_PASSWORD=[okta password]
* TOKEN=[Canvas token]

And put in your Canvas token without Bearer. Example: TOKEN=17~32131243413213123

### Each time CSV file structure (in no specific order)

Add csv file to 'field_admin_puppeteer/csv-storage' folder. Program will ask you which file to choose.

Required fields -
* email - User email
* domain - Canvas domain (ex. "domain.instructure.com" in that exact format)

Optional fields -
* full_name - User's full name to create account (default is email)
* login_id - User's login_id (default is email)
* account_admin - boolean, set "false" or "f" to NOT set up as account admin (default is true)
* field_admin - boolean, set "false" or "f" to NOT set up as field admin (default is true)
NOTE: Currently will only return Federation ID and not set up as Field Admin, so no harm if left "false"
* sf_id - **This does not currently function right now, but hope to build out in the future**

### Sample file

```
email,domain,full_name,login_id,sf_id,field_admin,account_admin
example@example.com,domain.instructure.com,Jaron Johnson,jjohnson,001A000001FmoXJIAZ,T,F
example2@example.com,domain.instructure.com,Not Jaron,,001A000001FmoXJIAZ,f,t
example3@example.com,domain.instructure.com,,jokes,001A000001FmoXJIAZ,true,false
example4@example.com,domain.instructure.com,,,001A000001FmoXJIAZ,TRUE,FALSE
```
### To run
Move to main directory
```
npm start
```
or
```
yarn start
```

### The goal...
I do want this to be able to run for Field admins also... storing some notes about it here in case it happens in the future
Not built out to set up a user in SF at this point, but **will** spit out the federated ID by default right now.

Optional Fields
* sf_id - Salesforce Account ID (required for Field Admin setup)
    - ex. https://instructure.lightning.force.com/lightning/r/Account/001A000001FmoXJIAZ/view
    - ID = 001A000001FmoXJIAZ

