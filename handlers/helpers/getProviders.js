const bech32 = require('./bech32');
const confirmKeybase = require('./confirmKeybase');
const vmQuery = require('./vmQuery');
const { getCache, putCache } = require('./cache');
const batchProcess = require('./batchProcess');

const {
  delegationManagerContract,
  processTtl,
  network,
} = require(`../configs/${process.env.CONFIG}`);

const getProvidersAddresses = async () => {
  const key = 'providersAddresses';
  const cached = await getCache({ key });

  if (cached) {
    return cached;
  }

  try {
    const providersBase64 = await vmQuery({
      contract: delegationManagerContract,
      func: 'getAllContractAddresses',
    });

    const value = providersBase64.map((providerBase64) =>
      bech32.encode(Buffer.from(providerBase64, 'base64').toString('hex'))
    );

    await putCache({ key, value, ttl: processTtl });

    return value;
  } catch (error) {
    return false;
  }
};

const getProviderConfig = async (address) => {
  let [
    ownerBase64,
    serviceFeeBase64,
    delegationCapBase64,
    // initialOwnerFundsBase64,
    // automaticActivationBase64,
    // changeableServiceFeeBase64,
    // checkCapOnredelegateBase64,
    // unBondPeriodBase64,
    // createdNonceBase64,
  ] = await vmQuery({
    contract: address,
    func: 'getContractConfig',
  });

  const owner = bech32.encode(Buffer.from(ownerBase64, 'base64').toString('hex'));

  const [serviceFee, delegationCap] = [
    // , initialOwnerFunds, createdNonce
    serviceFeeBase64,
    delegationCapBase64,
    // initialOwnerFundsBase64,
    // createdNonceBase64,
  ].map((base64) => {
    const hex = base64 ? Buffer.from(base64, 'base64').toString('hex') : base64;
    return hex === null ? null : BigInt(hex ? '0x' + hex : hex).toString();
  });

  // const [automaticActivation, changeableServiceFee, checkCapOnredelegate] = [
  //   automaticActivationBase64,
  //   changeableServiceFeeBase64,
  //   checkCapOnredelegateBase64,
  // ].map((base64) => (Buffer.from(base64, 'base64').toString() === 'true' ? true : false));

  return {
    owner,
    serviceFee: String(parseInt(serviceFee) / 10000),
    delegationCap,
    // initialOwnerFunds,
    // automaticActivation,
    // changeableServiceFee,
    // checkCapOnredelegate,
    // createdNonce: parseInt(createdNonce),
  };
};

const getProviderMetadata = async (address) => {
  try {
    const response = await vmQuery({
      contract: address,
      func: 'getMetaData',
    });

    if (response) {
      const [name, website, identity] = response.map((base64) =>
        Buffer.from(base64, 'base64').toString().trim().toLowerCase()
      );

      return { name, website, identity };
    }
  } catch (error) {
    return { name: null, website: null, identity: null };
  }
};

const getNumUsers = async (address) => {
  const [base64] = await vmQuery({
    contract: address,
    func: 'getNumUsers',
  });

  if (base64) {
    const hex = Buffer.from(base64, 'base64').toString('hex');
    return Number(BigInt(hex ? '0x' + hex : hex));
  }

  return null;
};

const getCumulatedRewards = async (address) => {
  const [base64] = await vmQuery({
    contract: address,
    func: 'getTotalCumulatedRewards',
    caller: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqlllllllllllllllllllllllllllsr9gav8',
  });

  if (base64) {
    const hex = Buffer.from(base64, 'base64').toString('hex');
    return BigInt(hex ? '0x' + hex : hex).toString();
  }

  return null;
};

const getProviders = async (args) => {
  const { skipCache } = args || {};

  const key = 'getProviders';

  if (!skipCache) {
    const cached = await getCache({ key });

    if (cached) {
      return cached;
    }
  }

  const providers = await getProvidersAddresses();
  if (providers) {
    const [configs, metadatas, numUsers, cumulatedRewards] = await Promise.all([
      batchProcess({
        payload: providers,
        handler: getProviderConfig,
        ttl: 900, // 15m
      }),
      batchProcess({
        payload: providers,
        handler: getProviderMetadata,
        ttl: 900, // 15m
      }),
      batchProcess({
        payload: providers,
        handler: getNumUsers,
        ttl: 3600, // 1h
      }),
      batchProcess({
        payload: providers,
        handler: getCumulatedRewards,
        ttl: 3600, // 1h
      }),
    ]);

    const payload = metadatas
      .map(({ identity }, index) => {
        return { identity, network, key: providers[index] };
      })
      .filter(({ identity }) => !!identity);

    const confirmations = await batchProcess({
      payload,
      handler: confirmKeybase,
      ttl: 604800, // 7d
    });

    const value = providers.map((provider, index) => {
      if (configs[index].serviceFee) {
        configs[index].serviceFee = parseFloat(configs[index].serviceFee);
      }

      configs[index].apr = 'N/A';

      return {
        provider,
        ...configs[index],
        numUsers: numUsers[index],
        cumulatedRewards: cumulatedRewards[index],
      };
    });

    payload.forEach(({ identity, key }, index) => {
      if (confirmations[index]) {
        const found = value.find(({ provider }) => provider === key);
        found.identity = identity;
      }
    });

    await putCache({ key, value, ttl: 3600 }); // 1h

    return value;
  }
  return false;
};

module.exports = getProviders;
