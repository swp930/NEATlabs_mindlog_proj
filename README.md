## Installing
```bash
npm install
```

## Running 
```bash
npm run start
```

Make sure you have the heroku cli and then use: ```heroku login``` to sign in with Professor Mishra's credentials

To update the code base: ```git push heroku master```

## Overall Logic
* Add Excel file in ```app/uploads```
* Client side code in ```app/js/dashboard.js```
* Server side code in ```index.js```
* Log in, ```handleLogin()``` in client
    * Extracts user id
    * If there is a corresponding Excel sheet for the given user id then get the sheet data for that user id ```getSheets()``` and ```submitSheet()``` in client
* Server parses the data out of the excel sheet ```extractDataFromExcel()``` in server
* Parsed data is returned back to the client side, back to ```submitSheet()``` in client
* Client side retrieves the data and forms graphs out of it, for each variable calls ```createGraphsForVariable()```