import inquirer from "inquirer"
import chalk from 'chalk'
import request from 'request'
import beeper from 'beeper'
import config from 'config'
import { FatNumber } from "./fat-number.js"
import { exec } from 'child_process';
import { Participant, Participation } from "./participant.js"

const prizes = []

/** @type {Participant[]} */
const participants = [];

console.clear();
logo();
await menu();

function beep() {
    exec(`rundll32 user32.dll,MessageBeep`)
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
    await beep()
    switch (option) {
        case options[0]:
            let numbers = config.get("numbers").map(number => new FatNumber(number.number, number.name, number.personal));
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

        const status = JSON.parse(res.body.replace('info=', '')).status;

        if(status > 1) {
            console.log('FINISH');
            beep();
            process.exit();
        }
        else if(status === 0) console.log("Not stated yet");
        else console.log('Running...');
    });
}

/**
 * 
 * @param {FatNumber[]} numbers 
 */
function allFatCheckerNumberNamed(numbers) {
    if(!participants.length) participants.push(...createParticipants(numbers));

    console.clear();
    logo();

    numbers.forEach(function (item) {
        fatCheckerNumber(item);
    });

    printParticipants(participants);
    fatCheckDrawStatus();
}

/**
 * 
 * @param {FatNumber} number 
 */
function fatCheckerNumber(number) {
    request(`https://api.elpais.com/ws/LoteriaNavidadPremiados?n=${number.getNumber()}`, { json: true }, (err, res, body) => {
        if (err) {
            console.log(JSON.stringify(err));
            return;
        }

        let result = JSON.parse(res.body.replace("busqueda=", ""));

        if (result.error !== 0) {
            number.error = true;
            return;
        }

        if (result.premio > 0) {
            number.setMoney(result.premio);
            const index = prizes.findIndex(x => x.number === number.getNumber());

            if (index === -1 || prizes[index].prize !== result.premio) beep()

            if (index === -1) prizes.push(number);
            else if (prizes[index].prize !== result.premio) prizes[index].prize = result.premio;
        }
    });
}

/**
 * 
 * @param {FatNumber[]} numbers 
 */
function printNumbers(numbers) {
    numbers.sort(number => number.name).forEach(number => printNumber(number));
}

/**
 * 
 * @param {FatNumber} number 
 */
function printNumber(number) {
    let numberStr = `-> ${number.getName().padEnd(10)} ${number.getNumberPad()} Prize: ${chalk.red(number.prize)}`;
    if (number.getError()) numberStr = `###### ${number.getName().padEnd(10)} ${number.getNumberPad()} ERROR`;
    else if (number.prize > 0) numberStr = chalk.green(`** ${number.getName().padEnd(10)} ${number.getNumberPad()} Prize: ${number.prize}`);

    console.log(numberStr);
}

/**
 * 
 * @param {Participant[]} participants 
 */
function printParticipants(participants) {
    const table = participants.map(p => ({name: p.name, prize: p.getMoney(), numbers: p.participations.filter(n => n.number.name === p.name && n.number.prize > 0).map(n => n.number.number)}));
    console.table(table);
}

/**
 * 
 * @param {FatNumber[]} numbers
 * @returns {Participant[]}
 */
function createParticipants(numbers) {
    const totalGroupParticipants = numbers.filter(n => !n.isPersonal).length;

    const participants = numbers.reduce((/** @type {Participant[]} */participants, /** @type {FatNumber} */number) => {
        let participant = participants.find(p => p.name === number.name);

        if (!participant) {
            participant = new Participant(number.name);
            participants.push(participant);
        }

        participant.participations.push(new Participation(number, number.isPersonal ? 1 : 1 / totalGroupParticipants));

        return participants;
    }, []);

    participants
        .filter(p => p.participations.filter(n => !n.number.isPersonal).length > 0)
        .forEach(p => numbers.filter(n => !n.isPersonal).forEach(n => p.addParticipation(n, 1/totalGroupParticipants)));

    return participants;
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