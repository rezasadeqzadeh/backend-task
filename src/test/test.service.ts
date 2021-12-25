import { ethers } from "ethers";
import { formatEther } from "ethers/lib/utils";

export class Test {
    getContract(){
        const provider = new ethers.providers.InfuraProvider("mainnet", process.env.projectId);

        //const address = "0xc00e94cb662c3520282e6f5717214004a7f26888"; //compound address
        const address = "0xdac17f958d2ee523a2206206994597c13d831ec7";

        const abi = [
            // Some details about the token
            "function name() view returns (string)",

             // Event emitted when tokens are minted
            "event Mint(address minter, uint mintAmount, uint mintTokens)",

            // @notice Event emitted when tokens are redeemed
            "event Redeem(address redeemer, uint redeemAmount, uint redeemTokens)",

            "event Transfer(address indexed from, address indexed to, uint amount)",
            "event Swap(uint256 indexed nonce, uint256 timestamp, address indexed signerWallet, IERC20 signerToken, uint256 signerAmount, uint256 signerFee, address indexed senderWallet, IERC20 senderToken, uint256 senderAmount)",
            "event Sync(uint112 reserve0, uint112 reserve1)"
        ];

        // The Contract object
        const contract = new ethers.Contract(address, abi, provider);
        contract.name().then( n  =>{
            console.log(n);
        }).catch( e  =>{
            console.log(e);
        });
        return contract

    }

    async start() {
        var contract  = this.getContract();
      //  contract.on("Sync", (sender, amount0In, amount1In,amount0Out, amount1Out,to ,event) => {
     //       console.log(`Sync : ${sender} sent ${formatEther(amount0In)} to ${to}`);
      //  });
       // contract.on("Transfer", (from, to, amount) => {
       //     console.log(`Transfer ${from} sent ${formatEther(amount)} to ${to}`);
       // });
        contract.on("Swap", ( nonce, timestamp, signerWallet, signerToken, signerAmount,  signerFee,  senderWallet, senderToken, senderAmount) => {
            console.log(`Swap : nonce:${nonce}  signerWallet: ${signerWallet} `);
        });
    }

}
