import inquirer from "inquirer"
import chalk from 'chalk'
import beeper from 'beeper'
import config from 'config'
import { FatNumber } from "./fat-number.js"
import { execFile } from 'child_process';
import { Participant, Participation } from "./participant.js"

const LOTTERY_API_BASE_URL = process.env.LOTTERY_API_BASE_URL ?? 'https://api.elpais.com/ws/LoteriaNavidadPremiados';
const REQUEST_TIMEOUT_MS = Number(process.env.LOTTERY_REQUEST_TIMEOUT_MS ?? 10000);
const NUMBER_POLL_INTERVAL_MS = 60000;
const DRAW_STATUS = {
    NOT_STARTED: 0,
    RUNNING: 1,
};

const prizes = []

/** @type {Participant[]} */
const participants = [];

console.clear();
logo();
await menu();

function beep() {
    if (process.platform === 'win32') {
        execFile('rundll32', ['user32.dll,MessageBeep']);
        return;
    }

    beeper();
}

function logo() {
    console.log('#  .__          __    __                                       .__                   __                 ');
    console.log('#  |  |   _____/  |__/  |_  ___________ ___.__.           ____ |  |__   ____   ____ |  | __ ___________ ');
    console.log('#  |  |  /  _ \\   __\\   __\\/ __ \\_  __ <   |  |  ______ _/ ___\\|  |  \\_/ __ \\_/ ___\\|  |/ // __ \\_  __ \\');
    console.log('#  |  |_(  <_> )  |  |  | \\  ___/|  | \/\\___  | /_____/ \\  \\___|   Y  \\  ___/\\  \\___|    <\\  ___/|  | \/');
    console.log('#  |____/\\____/|__|  |__|  \\___  >__|   / ____|          \\___  >___|  /\\___  >\\___  >__|_ \\\\___  >__|   ');
    console.log('#                              \/       \/                   \/     \/     \/     \/     \/    \/       ');
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
            await allFatCheckerNumberNamed(numbers);
            setInterval(() => allFatCheckerNumberNamed(numbers), config.get("time"));
            break;
        case options[1]:
            await fatCheckerNumber(new FatNumber(await promptNumber(), 'Number Entered'));
            break;
        case options[2]:
            await fatCheckDrawStatus();
            break;
        case options[3]:
            const number = new FatNumber(await promptNumber(), 'Recursive Entered')
            await fatCheckerNumber(number)
            setInterval(() => fatCheckerNumber(number), NUMBER_POLL_INTERVAL_MS);
            break;

        default:
            break;
    }
}

async function fatCheckDrawStatus() {
    try {
        const result = await fetchLotteryPayload({ queryParameter: 's', value: '1', jsonpPrefix: 'info=' });
        const status = Number(result.status);

        if(status > DRAW_STATUS.RUNNING) {
            console.log('FINISH');
            beep();
            process.exit();
        }
        else if(status === DRAW_STATUS.NOT_STARTED) console.log("Not stated yet");
        else console.log('Running...');
    }
    catch (error) {
        console.log(`Draw status check failed: ${error.message}`);
    }
}

/**
 * 
 * @param {FatNumber[]} numbers 
 */
async function allFatCheckerNumberNamed(numbers) {
    if(!participants.length) participants.push(...createParticipants(numbers));

    console.clear();
    logo();

    await Promise.all(numbers.map(number => fatCheckerNumber(number)));

    printParticipants(participants);
    await fatCheckDrawStatus();
}

/**
 * 
 * @param {FatNumber} number 
 */
async function fatCheckerNumber(number) {
    try {
        const result = await fetchLotteryPayload({
            queryParameter: 'n',
            value: number.getNumber(),
            jsonpPrefix: 'busqueda=',
        });

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
    }
    catch (error) {
        number.error = true;
        console.log(`Number ${number.getNumberPad()} check failed: ${error.message}`);
    }
}

async function fetchLotteryPayload({ queryParameter, value, jsonpPrefix }) {
    const url = new URL(LOTTERY_API_BASE_URL);
    url.searchParams.set(queryParameter, value);

    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
    const body = await response.text();

    if (!response.ok) {
        throw new Error(`Endpoint responded with ${response.status}`);
    }

    if (!body.startsWith(jsonpPrefix)) {
        throw new Error(`Unexpected endpoint response format`);
    }

    return parseLotteryPayload(body, jsonpPrefix);
}

async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { signal: controller.signal });
    }
    finally {
        clearTimeout(timeout);
    }
}

function parseLotteryPayload(body, jsonpPrefix) {
    try {
        return JSON.parse(body.slice(jsonpPrefix.length));
    }
    catch {
        throw new Error('Endpoint returned invalid JSON payload');
    }
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
            type: 'text',
            validate: value => /^\d{1,5}$/.test(value) || 'Enter a lottery number from 0 to 99999',
            filter: value => value.trim().padStart(5, '0'),
        }
    ])
    return number
}
