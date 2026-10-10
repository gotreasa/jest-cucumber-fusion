class BankAccount {
  constructor() {
    this.balance = 0;
    this.name = "";
    this.type = "Account";
  }

  deposit(amount) {
    this.balance += amount;
  }

  withdraw(amount) {
    this.balance -= amount;
  }
}

export { BankAccount };
