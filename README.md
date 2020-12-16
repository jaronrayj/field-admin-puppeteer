**PLEASE READ ALL**

This will run with Canvas APIs and Puppeteer to create users in Canvas, or add a login to their account and go through the field admin adding process. It will spit out a Federation ID for every single user at this point, even if they have multiple accounts already set up in Canvas. By default it will also set up each user as an account admin unless csv states otherwise (does not work for multiple user accounts already set up).

It does require you to have push notifications turned on for *Okta Verify* as well, midway through it will ask you to accept that it's you trying to sign in.

If creating a user this process _should_ also send the welcome email to the new users and ask that they set up a password for the first time.

## Prereqs
### One Time - Download, Install and .env file setup
Download the file from Github > Code > Download ZIP. Place in location that you won't delete it and unzip it. In the terminal navigate to root folder location such as cd ~/field_admin_puppeteer/
```
$ npm install
```
or
```
$ yarn install
```
Create a file at the root level (in the folder field_admin_puppeteer) named ".env" and input these values but with your own info:
```
OKTA_USERNAME=jjohnson
OKTA_PASSWORD=thisismypassword
TOKEN=17~32131243413213123 (siteadmin token)
```
### CSV File Structure (in no specific order)

Add csv file to 'field_admin_puppeteer/csv-storage' folder. Program will ask you which file to choose.

Required fields -
* email - User email
* domain - Canvas domain (ex. "domain.instructure.com" in that exact format)

Optional fields -
* full_name - User's full name to create account (default is email)
* login_id - User's login_id, will only set up if user does not exist already (default is email)
* account_admin - boolean, set "false" to NOT set up as account admin (default is true)
* sf_url - This is the Salesforce contact page for the user that you use to enable the customer user, i.e. https://instructure.lightning.force.com/lightning/r/Contact/0032G00002VCpCNQA1/view

### Sample File

```
email,domain,full_name,login_id,account_admin,sf_url
example@example.com,domain.instructure.com,Jaron Johnson,jjohnson,True,
example2@example.com,domain.instructure.com,Not Jaron,,false,https://instructure.lightning.force.com/lightning/r/Contact/003A000001dNHupIAG/view
example3@example.com,domain.instructure.com,,jokes,true,
example4@example.com,domain.instructure.com,,,FALSE,
```
### Required Fields ONLY Sample File 
Will create users, set up as account admin and return federation ids, can add any additional fields if desired.

```
email,domain
example@example.com,domain.instructure.com
example2@example.com,domain.instructure.com
example3@example.com,domain.instructure.com
example4@example.com,domain.instructure.com
```
### To Run
Move to main directory
```
$ npm start
```
or
```
$ yarn start
```

### The Goal...
I do want this to be able to fully run through the field admin setup process. Currenlty will set up users if SF contact url is provided, but will not finish with adding them to the "SF Field Admins" page.
This **will** spit out the federated ID for every user by default right now.

