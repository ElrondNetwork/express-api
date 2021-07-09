const axios = require('axios');

const {
  cache: { getCache, putCache },
  vmQuery,
  response,
} = require('./helpers');

const {
  gatewayUrl,
  delegationContract,
  auctionContract,
  axiosConfig,
} = require(`./configs/${process.env.CONFIG}`);

const locked = 2890000;

exports.handler = async ({ queryStringParameters }) => {
  const { extract } = queryStringParameters || {};

  try {
    const key = 'economics';

    const cached = await getCache({ key });

    if (cached) {
      return response({ data: cached, extract });
    }

    const [
      {
        data: {
          data: {
            account: { balance },
          },
        },
      },
      {
        data: {
          data: {
            metrics: { erd_total_staked_value, erd_total_supply },
          },
        },
      },
      waitingStake,
    ] = await Promise.all([
      axios.get(`${gatewayUrl()}/address/${auctionContract}`, axiosConfig),
      axios.get(`${gatewayUrl()}/network/economics`, axiosConfig),
      vmQuery({
        contract: delegationContract,
        func: 'getTotalStakeByType',
      }),
    ]);

    let staked;

    if (waitingStake && waitingStake !== 'ContractsUnavailable') {
      const [, totalWaitingStakeBase64] = waitingStake;

      const totalWaitingStakeHex = Buffer.from(totalWaitingStakeBase64, 'base64').toString('hex');
      let totalWaitingStake = BigInt(
        totalWaitingStakeHex ? '0x' + totalWaitingStakeHex : totalWaitingStakeHex
      );

      staked = parseInt((BigInt(balance) + totalWaitingStake).toString().slice(0, -18));
    }

    const totalSupply = parseInt(erd_total_supply.slice(0, -18));

    const circulatingSupply = totalSupply - locked;

    const data = { totalSupply, circulatingSupply, staked };

    await putCache({ key, value: data, ttl: 600 }); // 10m

    return response({ data, extract });
  } catch (error) {
    console.error('economics error', error);
    return response({ status: 503 });
  }
};
