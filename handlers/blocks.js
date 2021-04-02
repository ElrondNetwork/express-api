const {
  elasticSearch: { getList, getItem, getCount, getPublicKeys },
  response,
} = require('./helpers');

const transformItem = async (item) => {
  // eslint-disable-next-line no-unused-vars
  let { shardId: shard, epoch, proposer, validators, searchOrder, ...rest } = item;

  const publicKeys = await getPublicKeys({ shard, epoch });

  proposer = publicKeys[proposer];
  validators = validators.map((index) => publicKeys[index]);

  return { shard, epoch, proposer, validators, ...rest };
};

exports.handler = async ({ pathParameters, queryStringParameters }) => {
  try {
    const collection = 'blocks';
    const key = 'hash';
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

    // In elastic search exists only shardId
    if (query.shard) {
      query.shardId = query.shard;
      delete query.shard;
    }

    let data;
    let status;

    switch (true) {
      case hash !== undefined && hash === 'count': {
        data = await getCount({ collection, query });
        break;
      }
      case hash !== undefined: {
        const item = await getItem({ collection, key, hash });
        data = await transformItem(item);
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
    console.error('blocks error', error);
    return response({ status: 503 });
  }
};
