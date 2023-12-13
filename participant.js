import { FatNumber } from "./fat-number.js";

export class Participation {
    /**
     * 
     * @param {FatNumber} number
     * @param {number} percentage 
     */
    constructor(number, percentage) {
        this.number = number;
        this.percentage = percentage;
    }

    getMoney() {
        return this.number.prize * this.percentage;
    }
}

export class Participant {
    /**
     * 
     * @param {string} name 
     * @param {Participation[]} participations 
     */
    constructor(name, participations = []) {
        this.name = name;
        this.participations = participations;
    }

    getMoney() {
        return this.participations.reduce((total, participation) => {
            total += participation.getMoney();
            return total;
        }, 0);
    }

    /**
     * 
     * @param {FatNumber} number 
     * @param {number} percentage 
     */
    addParticipation(number, percentage) {
        if(this.participations.map(p => p.number).find(n => n === number)) return;

        this.participations.push(new Participation(number, percentage));
    }
}