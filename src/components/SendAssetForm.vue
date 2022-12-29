<template>
    <div id="buyasset" class="mb-5">
        <h3>Buy TESLA coin</h3>
        <p>You can only mint up to 1000 TESLA coins</p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>TESLA coins left: {{ this.asset_left }}</p>
        <form
            action="#"
            @submit.prevent="handleBuyAsset"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Buy amount</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
    </div>
</template>

<script>
import algosdk from 'algosdk';
//import { createDecipheriv } from 'crypto';
import { getAlgodClient } from "../client.js";
import * as helpers from '../helpers';
import configHolding from "../artifacts/mint_asset.js.cp.yaml"; 
import wallets from "../wallets.js";


export default {
    props: {
        connection: String,
        network: String,
    },
    data() {
        return {
            acsTxId: "",
            asset_left: 0,
            asset_amount: 0,
            explorerURL: "",
            algodClient: null,
            holdingsAppAddress: null,
            holdingsAppID: null,
        };
    },
    created(){
        this.algodClient = getAlgodClient("Localhost");
        this.holdingsAppAddress = configHolding.default.metadata.holdingsAppAddress;
        this.holdingsAppID = configHolding.default.metadata.holdingsAppID;
        this.amountTesla();
    },
    methods: {
        
        async amountTesla(){
           // const algodClient = getAlgodClient("Localhost");
            let applicationInfoResponse1 = await this.algodClient.accountInformation(this.holdingsAppAddress).do();
            this.asset_left=applicationInfoResponse1.assets[0].amount;
        },

        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleBuyAsset() {
            // write code here
            this.amountTesla();
           // const algodClient = getAlgodClient("Localhost");
            let userAccount = algosdk.mnemonicToSecretKey(process.env.VUE_APP_ACC2_MNEMONIC);
            let sender = userAccount.addr;

            let params = await this.algodClient.getTransactionParams().do();
            params.fee = 1000
            params.flatFee = true

           // const index= configHolding.default.ssc.holdings_approval.appID;

            //OptIn the app
           // let txnforOptin = algosdk.makeApplicationOptInTxn(sender, params, index);

            //await wallets.sendAlgoSignerTransaction(txnforOptin, algodClient); 

            let applicationInfoResponse = await this.algodClient.getApplicationByID(this.holdingsAppID).do();
            
            let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                sender,
                sender,
                undefined,
                undefined,
                0,
                undefined,
                applicationInfoResponse['params']['global-state'][0].value.uint,
                params
            );

            alet senderInfoResponse1 = await this.algodClient.accountInformation(sender).do();
            for(let i =0; i <= senderInfoResponse1.assets.length; i++){
               
            if(typeof senderInfoResponse1.assets[i] === 'undefined' ||(senderInfoResponse1.assets[i]['asset-id'] !== applicationInfoResponse['params']['global-state'][0].value.uint && i > senderInfoResponse1.assets.length - 1)){
                let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                                   sender,
                                   sender,
                                   undefined,
                                   undefined,
                                   0,
                                   undefined,
                                   applicationInfoResponse['params']['global-state'][0].value.uint,
                                   params
                               );
                await wallets.sendAlgoSignerOptIn(txn1, this.algodClient);
                break;
            } 
            if(senderInfoResponse1.assets[i]['asset-id'] === applicationInfoResponse['params']['global-state'][0].value.uint){
                break;
            }
           }

            let txn2 = algosdk.makePaymentTxnWithSuggestedParams(sender, this.holdingsAppAddress, applicationInfoResponse['params']['global-state'][1].value.uint*this.asset_amount +1000, undefined, undefined, params);

            let appArgs = [new Uint8Array(Buffer.from("purchase")), algosdk.encodeUint64(Number(this.asset_amount))];

            let txn3 = algosdk.makeApplicationNoOpTxn(sender, params, this.holdingsAppID,appArgs,undefined,undefined,[applicationInfoResponse['params']['global-state'][0].value.uint]);
            // Store txns
            let txns = [txn2, txn3];

            // Assign group ID
            algosdk.assignGroupID(txns);

            const signeTxns = await wallets.sendAlgoSignerTransaction(txns,this.algodClient);
            if(signeTxns){
                this.updateTxn(signeTxns.txId)
            }else{
                alert("transaction fails")
            }
                
        },
    },
};
</script>
