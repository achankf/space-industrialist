import { Galaxy, Habitat, IBankAccount } from "./model.js";

export class Corporation implements IBankAccount {

    constructor(
        public readonly id: number,
    ) {
        //
    }

    public getAccount() {
        return this;
    }

    public onBankrupt() {
        // TODO
        console.log("company bankrupted");
    }

    public assetWorth() {
        return 100000000; // TODO
    }
}
