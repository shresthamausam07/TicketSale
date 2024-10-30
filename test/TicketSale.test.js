const assert = require("assert");
const ganache = require("ganache");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());
const { abi, bytecode } = require("../compile");

let accounts;
let ticketSale;
const TICKET_PRICE = web3.utils.toWei("0.01", "ether");
const NUM_TICKETS = 100;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  ticketSale = await new web3.eth.Contract(abi)
    .deploy({
      data: bytecode,
      arguments: [NUM_TICKETS, TICKET_PRICE],
    })
    .send({ from: accounts[0], gas: "3000000" });
});

describe("TicketSale Contract", () => {
  // Test 1: Basic Contract Deployment
  it("deploys successfully", () => {
    assert.ok(ticketSale.options.address);
  });

  // Test 2: Initial Ticket Purchase
  describe("ticket purchasing", () => {
    it("allows buying a ticket", async () => {
      await ticketSale.methods.buyTicket(1).send({
        from: accounts[1],
        value: TICKET_PRICE,
        gas: "3000000",
      });
      const owner = await ticketSale.methods.getTicketOf(accounts[1]).call();
      assert.equal(owner, "1");
    });
  });

  // Test 3: Ticket Swapping
  describe("ticket swapping", () => {
    it("allows ticket swapping between users", async () => {
      // First user buys ticket #1
      await ticketSale.methods.buyTicket(1).send({
        from: accounts[1],
        value: TICKET_PRICE,
        gas: "3000000",
      });

      // Second user buys ticket #2
      await ticketSale.methods.buyTicket(2).send({
        from: accounts[2],
        value: TICKET_PRICE,
        gas: "3000000",
      });

      // First user offers swap
      await ticketSale.methods.offerSwap(2).send({
        from: accounts[1],
        gas: "3000000",
      });

      // Second user accepts swap
      await ticketSale.methods.acceptSwap(1).send({
        from: accounts[2],
        gas: "3000000",
      });

      const ticket1Owner = await ticketSale.methods
        .getTicketOf(accounts[2])
        .call();
      const ticket2Owner = await ticketSale.methods
        .getTicketOf(accounts[1])
        .call();

      assert.equal(ticket1Owner, "1");
      assert.equal(ticket2Owner, "2");
    });
  });

  // Test 4: Resale Process
  describe("resale functionality", () => {
    it("completes full resale process", async () => {
      // Initial purchase
      await ticketSale.methods.buyTicket(1).send({
        from: accounts[1],
        value: TICKET_PRICE,
        gas: "3000000",
      });

      // List for resale
      const resalePrice = web3.utils.toWei("0.02", "ether");
      await ticketSale.methods.resaleTicket(resalePrice).send({
        from: accounts[1],
        gas: "3000000",
      });

      // Verify listing
      const resaleList = await ticketSale.methods.checkResale().call();
      assert.equal(resaleList[0], "1");

      // New buyer purchases ticket
      const initialBalance = await web3.eth.getBalance(accounts[1]);

      await ticketSale.methods.acceptResale(1).send({
        from: accounts[2],
        value: resalePrice,
        gas: "3000000",
      });

      // Verify new ownership
      const newOwner = await ticketSale.methods.getTicketOf(accounts[2]).call();
      assert.equal(newOwner, "1");
    });
  });

  // Test 5: Service Fee
  describe("service fee", () => {
    it("handles service fee correctly", async () => {
      const initialManagerBalance = web3.utils.toBN(
        await web3.eth.getBalance(accounts[0])
      );

      // Buy ticket
      await ticketSale.methods.buyTicket(1).send({
        from: accounts[1],
        value: TICKET_PRICE,
        gas: "3000000",
      });

      // List for resale
      const resalePrice = web3.utils.toWei("0.02", "ether");
      await ticketSale.methods.resaleTicket(resalePrice).send({
        from: accounts[1],
        gas: "3000000",
      });

      // Complete resale
      await ticketSale.methods.acceptResale(1).send({
        from: accounts[2],
        value: resalePrice,
        gas: "3000000",
      });

      const finalManagerBalance = web3.utils.toBN(
        await web3.eth.getBalance(accounts[0])
      );
      const expectedFee = web3.utils.toBN(resalePrice).div(web3.utils.toBN(10));
      const actualFee = finalManagerBalance.sub(initialManagerBalance);

      assert(
        actualFee.gte(expectedFee),
        "Manager did not receive correct service fee"
      );
    });
  });
});
