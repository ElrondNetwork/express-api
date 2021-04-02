const {
  elasticSearch: { getList, getCount, getPublicKeys },
  response,
} = require('./helpers');

const transformItem = async (item) => {
  let { key, round, timestamp, blockWasProposed, signersIndexes } = item;

  // TODO: use the indexed value when available
  const epoch = Math.floor(round / 14401);

  let [shard] = key.split('_');
  shard = parseInt(shard);

  const publicKeys = await getPublicKeys({ shard, epoch });
  const signers = signersIndexes.map((index) => publicKeys[index]);

  return { round, shard, blockWasProposed, signers, timestamp };
};

exports.handler = async ({ pathParameters, queryStringParameters }) => {
  try {
    const collection = 'rounds';
    const key = 'key';
    const { hash } = pathParameters || {};
    let query = queryStringParameters || {};

    const keys = ['shard', 'from', 'size'];

    const condition = queryStringParameters['condition']
      ? queryStringParameters['condition']
      : 'must';

    Object.keys(query).forEach((key) => {
      if (!keys.includes(key)) {
        delete query[key];
      }
    });

    let data;
    let status;

    switch (true) {
      case hash !== undefined && hash === 'count': {
        data = await getCount({ collection, query });
        break;
      }
      default: {
        const sort = {
          timestamp: 'desc',
        };

        const items = await getList({ collection, key, query, sort, condition });

        data = [];
        for (const item of items) {
          data.push(await transformItem(item));
        }
        break;
      }
    }

    return response({ status, data });
  } catch (error) {
    console.error('rounds error', error);
    return response({ status: 503 });
  }
};
