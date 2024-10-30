pragma solidity ^0.8.17;

contract TicketSale {
    // Contract variables
    struct Ticket {
        address owner;
        bool isOnSale;
        uint resalePrice;
    }
    
    address public manager;
    uint public ticketPrice;
    uint public maxTickets;
    mapping(uint => Ticket) public tickets;
    mapping(address => uint) public ticketOwnership;
    mapping(address => mapping(address => uint)) public swapOffers;
    uint[] private resaleTicketsList;

    constructor(uint numTickets, uint price) public {
        require(numTickets > 0, "Number of tickets must be positive");
        require(price > 0, "Price must be positive");
        
        manager = msg.sender;
        ticketPrice = price;
        maxTickets = numTickets;
    }

    function buyTicket(uint ticketId) public payable {
        require(ticketId > 0 && ticketId <= maxTickets, "Invalid ticket ID");
        require(tickets[ticketId].owner == address(0), "Ticket already sold");
        require(ticketOwnership[msg.sender] == 0, "Already owns a ticket");
        require(msg.value == ticketPrice, "Incorrect payment amount");

        tickets[ticketId].owner = msg.sender;
        ticketOwnership[msg.sender] = ticketId;
    }

    function getTicketOf(address person) public view returns (uint) {
        return ticketOwnership[person];
    }

    function offerSwap(uint ticketId) public {
        require(ticketOwnership[msg.sender] != 0, "No ticket owned");
        require(tickets[ticketId].owner != address(0), "Target ticket not sold");
        require(tickets[ticketId].owner != msg.sender, "Cannot swap with self");
        
        swapOffers[msg.sender][tickets[ticketId].owner] = ticketOwnership[msg.sender];
    }

    function acceptSwap(uint ticketId) public {
        require(ticketOwnership[msg.sender] != 0, "No ticket owned");
        require(swapOffers[tickets[ticketId].owner][msg.sender] != 0, "No swap offer found");
        
        uint offererTicketId = swapOffers[tickets[ticketId].owner][msg.sender];
        uint accepterTicketId = ticketOwnership[msg.sender];
        
        address offerer = tickets[offererTicketId].owner;
        tickets[offererTicketId].owner = msg.sender;
        tickets[accepterTicketId].owner = offerer;
        ticketOwnership[msg.sender] = offererTicketId;
        ticketOwnership[offerer] = accepterTicketId;
        
        swapOffers[offerer][msg.sender] = 0;
    }

    function resaleTicket(uint price) public {
        uint ticketId = ticketOwnership[msg.sender];
        require(ticketId != 0, "No ticket owned");
        require(!tickets[ticketId].isOnSale, "Ticket already on sale");
        require(price > 0, "Price must be positive");

        tickets[ticketId].isOnSale = true;
        tickets[ticketId].resalePrice = price;
        resaleTicketsList.push(ticketId);
    }

    function acceptResale(uint ticketId) public payable {
        require(tickets[ticketId].isOnSale, "Ticket not on sale");
        require(ticketOwnership[msg.sender] == 0, "Already owns a ticket");
        require(msg.value == tickets[ticketId].resalePrice, "Incorrect payment amount");
        require(tickets[ticketId].owner != msg.sender, "Cannot buy own ticket");

        uint price = tickets[ticketId].resalePrice;
        address seller = tickets[ticketId].owner;
        uint serviceFee = (price * 10) / 100;
        uint sellerAmount = price - serviceFee;

        address oldOwner = tickets[ticketId].owner;
        tickets[ticketId].owner = msg.sender;
        tickets[ticketId].isOnSale = false;
        tickets[ticketId].resalePrice = 0;
        ticketOwnership[msg.sender] = ticketId;
        ticketOwnership[oldOwner] = 0;

        for (uint i = 0; i < resaleTicketsList.length; i++) {
            if (resaleTicketsList[i] == ticketId) {
                resaleTicketsList[i] = resaleTicketsList[resaleTicketsList.length - 1];
                resaleTicketsList.pop();
                break;
            }
        }

        (bool successManager, ) = payable(manager).call{value: serviceFee}("");
        require(successManager, "Manager payment failed");
        
        (bool successSeller, ) = payable(seller).call{value: sellerAmount}("");
        require(successSeller, "Seller payment failed");
    }

    function checkResale() public view returns (uint[] memory) {
        return resaleTicketsList;
    }
}