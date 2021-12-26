export const config = () => ({
    port : 3000,
    infuraProjectId : "ea9914cba354454abb21da7d8549b96f",
    netName: "mainnet",
    marketAddresses : [
        "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" // cETH address
    ],
    abiPath : "./src/collector/mainnet_cETH.abi",
});
