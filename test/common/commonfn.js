const { convert, runtime } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

const mintApprovalFile = "mint_approval.py";
const mintClearStateFile = "mint_clearstate.py";

const holdingApprovalFile = "holdings_approval.py";
const holdingClearStateFile = "holdings_clearstate.py";

const burnApprovalFile = "burn_approval.py";
const burnclearStateFile = "burn_clearstate.py";

const initContract = (runtime, creatorAccount, approvalFile, clearStateFile, locInts, locBytes, gloInts, gloBytes, args) => {
    // create new app
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: creatorAccount,
            localInts: locInts,
            localBytes: locBytes,
            globalInts: gloInts,
            globalBytes: gloBytes,
            appArgs: args,
        },
        { totalFee: 1000 }, //pay flags
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;  

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount, //use the account object
        toAccountAddr: appAddress, //app address
        amountMicroAlgos: 2e7, //20 algos
        payFlags: { totalFee: 1000 },
    });

    return appInfo;
};



const initMint = (runtime,master) => {
    return initContract(
        runtime, 
        master, 
        mintApprovalFile, 
        mintClearStateFile,
        0,
        0,
        1,
        2,
        []
    );
};


const createAsset = (runtime,master,appID) => {

    //create asset
    const createAsset = ["create_asset"].map(convert.stringToBytes);
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: createAsset,
    });

    //get asset ID
    const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);
    const assetID = Number(getGlobal(appID, "teslaid"));

    return assetID;
}


const initBurn = (runtime,master,assetID) => {
    return initContract(
        runtime, 
        master, 
        burnApprovalFile, 
        burnclearStateFile,
        0,
        0,
        1,
        0,
        [convert.uint64ToBigEndian(assetID)]
    );
};

const initHolding = (runtime,master,assetID) => {
    return initContract(
        runtime, 
        master, 
        holdingApprovalFile, 
        holdingClearStateFile,
        0,
        0,
        2,
        0,
        [convert.uint64ToBigEndian(assetID)]
    );
};

const optIn = (runtime, account, appID, assetID) => {
    const optinAsset = ["optin_asset"].map(convert.stringToBytes);
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: optinAsset,
    });
};

const transfer = (runtime, type, amountToSend, account, appID, appAccount, assetID) => {
    const appArgs = [convert.stringToBytes(type),convert.uint64ToBigEndian(amountToSend)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        accounts: [appAccount],
        foreignAssets: [assetID],
        appArgs: appArgs,
    });
};


const updatePrice = (runtime, account, appID, newPrice) => {
    const updateprice = [convert.stringToBytes("UpdatePrice"),convert.uint64ToBigEndian(newPrice)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: updateprice,
    });
};

const saveAccounts = (runtime, account, appID, holdigsAppAdress,burnAppAdress) => {
    const save_accounts  = ["save"].map(convert.stringToBytes);
    const accounts = [holdigsAppAdress,burnAppAdress];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        accounts: accounts,
        appArgs: save_accounts,
    });
}

const selling = (runtime, account, assetID, appAccount, amountOfAlgo, appID, amountOfAsset) => {
    const appArgs = [convert.stringToBytes("selling"),convert.uint64ToBigEndian(amountOfAsset)];
    runtime.executeTx([{
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        toAccountAddr: appAccount,
        amountMicroAlgos: amountOfAlgo,
        payFlags: { totalFee: 1000 },
    },{
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        payFlags: { totalFee: 1000 },
        foreignAssets: [assetID],
        appArgs: appArgs,
    }]);
}


module.exports = {
    initMint,
    createAsset,
    initHolding,
    initBurn,
    optIn,
    updatePrice,
    transfer,
    saveAccounts,
    selling,
}