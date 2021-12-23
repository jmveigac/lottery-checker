const inquirer = require("inquirer");
const chalk = require('chalk');
const request = require('request');
const beep = require('beepbeep');
const config = require('config');

const prizes = []

console.clear();
logo();
menu();

class FatNumber {
    constructor(number, name) {
        this.name = name;
        this.number = number;
    }
    setMoney(prize) {
        this.prize = prize;
    }
    getNumber() {
        return this.number;
    }
    getNumberPad() {
        return `${this.number}`.padStart(5);
    }
    getName() {
        return this.name;
    }
}

function logo() {
    console.log('#  .__          __    __                                       .__                   __                 ');
    console.log('#  |  |   _____/  |__/  |_  ___________ ___.__.           ____ |  |__   ____   ____ |  | __ ___________ ');
    console.log('#  |  |  /  _ \\   __\\   __\\/ __ \\_  __ <   |  |  ______ _/ ___\\|  |  \\_/ __ \\_/ ___\\|  |/ // __ \\_  __ \\');
    console.log('#  |  |_(  <_> )  |  |  | \\  ___/|  | \\/\\___  | /_____/ \\  \\___|   Y  \\  ___/\\  \\___|    <\\  ___/|  | \\/');
    console.log('#  |____/\\____/|__|  |__|  \\___  >__|   / ____|          \\___  >___|  /\\___  >\\___  >__|_ \\\\___  >__|   ');
    console.log('#                              \\/       \\/                   \\/     \\/     \\/     \\/     \\/    \\/       ');
    console.log('#                                                                                                       ');
    console.log('#                                                                                                       ');
    console.log('#                                                                                                       ');
    console.log('#                                                                                                       ');
    console.log('#                                                                                                       ');
    console.log('#                                                                                                       ');
}

function menu() {
    inquirer.prompt([
        {
            name: 'decission',
            message: `What would you like to check?\rCheck ${chalk.green('A')}ll from config recursively.\r ${chalk.green('F')}at christmas prize for one number.\r${chalk.green('D')}raw status.\r${chalk.green('R')}epeating check to number.\r${chalk.red('E')}xit: `,
            type: 'input'
        }
    ]).then(({ decission }) => {
        if (decission == 'F' || decission == 'f')
            inquirer.prompt([
                {
                    name: 'number',
                    message: 'Number: ',
                    type: 'input'
                }
            ]).then(({ number }) => {
                fatCheckerNumber(number);
            });
        else if (decission == 'D' || decission == 'd')
            fatCheckDrawStatus();
        else if (decission == 'R' || decission == 'r')
            inquirer.prompt([
                {
                    name: 'number',
                    message: 'Number: ',
                    type: 'input'
                }
            ]).then(({ number }) => {
                fatCheckerNumber(number)
                setInterval(() => fatCheckerNumber(number), 60000);
            });
        else if (decission == 'A' || decission == 'a') {
            let numbers = config.get("numbers").map(number => new FatNumber(number.number, number.name));
            allFatCheckerNumberNamed(numbers);
            setInterval(() => allFatCheckerNumberNamed(numbers), config.get("time"));
        }
    });
}

function fatCheckDrawStatus() {
    request(`https://api.elpais.com/ws/LoteriaNavidadPremiados?s=1`, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(res.body);
    });
}

function allFatCheckerNumberNamed(numbers) {
    console.clear();
    logo();

    numbers.forEach(function (item) {
        fatCheckerNumber(item);
    });
}

function fatCheckerNumber(number) {
    request(`https://api.elpais.com/ws/LoteriaNavidadPremiados?n=${number.getNumber()}`, { json: true }, (err, res, body) => {
        if (err) {
            console.log(JSON.stringify(err));
            return;
        }

        let result = JSON.parse(res.body.replace("busqueda=", ""));

        if (result.error !== 0) {
            console.log(`###### ${number.getName().padEnd(10)} ${number.getNumberPad()} ERROR`);
            return;
        }

        if (result.premio == 0)
            console.log(`-> ${number.getName().padEnd(10)} ${number.getNumberPad()} Prize: ${chalk.red(result.premio)}`);
        else {
            console.log(chalk.green(`** ${number.getName().padEnd(10)} ${number.getNumberPad()} Prize: ${result.premio}`));

            const index = prizes.findIndex(x => x.number === number.getNumber());

            if(index === -1 || prizes[index].prize !== result.premio) beep();

            if(index === -1) prizes.push({number: number.getNumber(), prize: result.premio});
            else if(prizes[index].prize !== result.premio) prizes[index].prize = result.premio;
        }
    });
}