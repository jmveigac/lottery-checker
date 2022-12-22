import inquirer from "inquirer"
import chalk from 'chalk'
import request from 'request'
import beeper from 'beeper'
import config from 'config'
import { FatNumber } from "./fat-number.js"

const prizes = []

console.clear();
logo();
await menu();

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

async function menu() {
    const options = [`Check ${chalk.green('A')}ll from config recursively`, `${chalk.green('F')}at christmas prize for one number`, `${chalk.green('D')}raw status`, `${chalk.green('R')}epeating check to number`, `${chalk.red('E')}xit`]
    const { option } = await inquirer.prompt([
        {
            name: 'option',
            message: `What would you like to check?`,
            type: 'list',
            choices: options
        }
    ])
    await beeper(3)
    switch (option) {
        case options[0]:
            let numbers = config.get("numbers").map(number => new FatNumber(number.number, number.name));
            allFatCheckerNumberNamed(numbers);
            setInterval(() => allFatCheckerNumberNamed(numbers), config.get("time"));
            break;
        case options[1]:
            fatCheckerNumber(new FatNumber(await promptNumber(), 'Number Entered'));
            break;
        case options[2]:
            fatCheckDrawStatus();
            break;
        case options[3]:
            const number = new FatNumber(await promptNumber(), 'Recursive Entered')
            fatCheckerNumber(number)
            setInterval(() => fatCheckerNumber(number), 60000);
            break;

        default:
            break;
    }
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

            if (index === -1 || prizes[index].prize !== result.premio) beeper(3)

            if (index === -1) prizes.push({ number: number.getNumber(), prize: result.premio });
            else if (prizes[index].prize !== result.premio) prizes[index].prize = result.premio;
        }
    });
}

async function promptNumber() {
    const { number } = await inquirer.prompt([
        {
            name: 'number',
            message: 'Number: ',
            type: 'text'
        }
    ])
    return number
}