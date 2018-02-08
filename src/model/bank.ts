import * as Algo from "../algorithm/algorithm.js";
import { Galaxy, Habitat, IBankAccount } from "./model.js";

const BANKRUPT_FACTOR = 2;

export class Bank { // represents central bank and other financial institutions
    constructor(
        private interestRate = 0, // yearly interest rate, compounded daily
        private inflation = 0,
        private loans = new Map<IBankAccount, number>(),
        private savings = new Map<IBankAccount, number>(),
    ) { }

    public moneySupply() {
        return Algo.sum(...this.loans.values(), ... this.savings.values());
    }

    public moneySupplyPerPerson() {
        return 5000;
    }

    public borrow(borrower: IBankAccount, amount: number) {
        console.assert(amount >= 0);
        console.assert(Number.isFinite(amount));
        const totalLoan = Algo.getAndSum(this.loans, borrower, amount);
        if (totalLoan > BANKRUPT_FACTOR * borrower.assetWorth()) {
            borrower.onBankrupt(this);
        }
    }

    public repay(borrower: IBankAccount, maxAmount = this.savingAmount(borrower)) {
        console.assert(maxAmount >= 0);
        const debt = Algo.getQty(this.loans, borrower);

        // savings cannot afford maxAmount; caller should check
        console.assert(maxAmount <= this.savingAmount(borrower));

        const repayAmount = debt > maxAmount ? maxAmount : debt;
        this.withdraw(borrower, repayAmount);
        const balance = debt - repayAmount;
        console.assert(balance >= 0);
        console.assert(Number.isFinite(balance)); // check by the caller
        if (balance < 0.01) { // epsilon = 0.01, owe nothing
            this.loans.set(borrower, 0);
        } else {
            this.loans.set(borrower, balance);
        }
    }

    public debtAmount(borrower: IBankAccount) {
        const ret = Algo.getQty(this.loans, borrower);
        console.assert(ret >= 0);
        return ret;
    }

    public savingAmount(account: IBankAccount) {
        const ret = Algo.getQty(this.savings, account);
        console.assert(ret >= 0);
        return ret;
    }

    public dailyInterestRate() {
        return this.interestRate / 120; // 120 days per year, 30 days per month, 1 month per season (not finaly)
    }

    public getInflation() {
        return this.inflation;
    }

    public recalculate(galaxy: Galaxy) {
        this.updateInflation(galaxy);
        this.destroyMoney();
    }

    public deposit(account: IBankAccount, amount: number) {
        console.assert(amount >= 0);
        Algo.getAndSum(this.savings, account, amount);
    }

    public withdraw(account: IBankAccount, amount: number) {
        console.assert(amount >= 0);
        const saving = this.savingAmount(account);
        if (amount > saving) { // withdraw more than savings, take a loan
            this.savings.set(account, 0);
            const needed = amount - saving;
            if (needed >= 0.01) {
                this.borrow(account, needed);
            }
        } else {
            const balance = saving - amount;
            if (balance < 0.01) {
                this.savings.set(account, 0);
            } else {
                this.savings.set(account, balance);
            }
        }
    }

    public transfer(from: IBankAccount, to: IBankAccount, amount: number) {
        console.assert(amount >= 0);
        this.withdraw(from, amount);
        this.deposit(to, amount);
    }

    private updateInflation(galaxy: Galaxy) {
        const population = Algo.sum(...Array
            .from(galaxy.habitats)
            .map((x) => x.getPopulation()));
        const moneySupplyLimit = population * this.moneySupplyPerPerson();
        console.assert(moneySupplyLimit >= 0);
        const moneySupply = this.moneySupply();
        if (moneySupplyLimit === 0) {
            return 0.5; // TODO
        }
        this.inflation = Math.max(0.05, (moneySupply - moneySupplyLimit) / moneySupplyLimit);
    }

    private destroyMoney() {
        // 120 days per year, 30 days per month, 1 month per season (not finaly)
        const numDaysPerYear = 120;
        const realInterestRate = (this.interestRate - this.inflation) / numDaysPerYear;
        for (const [borrower, amount] of this.loans) {
            console.assert(amount >= 0);
            const interest = amount * realInterestRate;
            if (interest > 0) {
                this.withdraw(borrower, interest);
            } else {
                this.deposit(borrower, -interest);
            }
        }
        for (const [borrower, amount] of this.savings) {
            console.assert(amount >= 0);
            const interest = amount * realInterestRate;
            if (interest > 0) {
                this.deposit(borrower, interest);
            } else {
                this.withdraw(borrower, -interest);
            }
        }
    }
}
