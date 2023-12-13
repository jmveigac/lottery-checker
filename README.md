# lottery-checker
This is a console app to check the numbers of the Christmas prize of the spanish lottery .

## Configuration
To use option A(Check All from config recursively.) you need to add the following folder and file:
>/config/default.json.
### Example default.json:
```json
    "numbers": [
        {
            "number": 12345,
            "name": "name"
        },
        {
            "number": 54321,
            "name": "name 2",
            "private": true
        }
    ],
    "time": 10000
```
## Call
This app calls to `api.elpais.com` to check the numbers.  
The api doc is in the following url: https://servicios.elpais.com/sorteos/loteria-navidad/api/

## Start
On the main folder, run the next sentence:
```node
npm start
```