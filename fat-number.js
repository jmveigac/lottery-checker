export class FatNumber {
    constructor(number, name, personal = false) {
        this.name = name;
        this.number = number;
        this.error = false;
        this.isPersonal = personal;
        this.prize = 0;
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
    getError() {
        return this.error;
    }
}