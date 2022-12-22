export class FatNumber {
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