const path = require("path");
const fs = require("fs");
const solc = require("solc");

const contractPath = path.resolve(__dirname, "contracts", "TicketSale.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "TicketSale.sol": {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["*"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
console.log(
  "ABI:",
  JSON.stringify(output.contracts["TicketSale.sol"].TicketSale.abi)
);
console.log(
  "Bytecode:",
  output.contracts["TicketSale.sol"].TicketSale.evm.bytecode.object
);

// Save ABI and Bytecode to separate files
fs.writeFileSync(
  "ABI.json",
  JSON.stringify(output.contracts["TicketSale.sol"].TicketSale.abi, null, 2)
);
fs.writeFileSync(
  "Bytecode.txt",
  output.contracts["TicketSale.sol"].TicketSale.evm.bytecode.object
);
console.log("ABI and Bytecode have been generated and saved.");

module.exports = {
  abi: output.contracts["TicketSale.sol"].TicketSale.abi,
  bytecode: output.contracts["TicketSale.sol"].TicketSale.evm.bytecode.object,
};
