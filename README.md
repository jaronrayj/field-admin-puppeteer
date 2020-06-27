# field-admin-selenium

## .env file setup

* OKTALOGIN=oktausername
* OKTAPASSWORD=oktapassword
* TOKEN=CanvasToken(no Bearer)

## CSV file structure (in no specific order)

Required fields -
* email - User email
* domain - Canvas domain (ex. domain.instructure.com)

Optional fields -
* full_name - User's full name to create account
* login_id - User's login_id (default is email above)
* sf_id - Salesforce Account ID (required for Field Admin setup)
* field_admin - boolean, set true to enable as field admin (default is true)
* account_admin - boolean, set true to enable as account admin (default is true)