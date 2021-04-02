const {
  elasticSearch: { getList, getItem, getCount },
  response,
} = require('./helpers');

const transformItem = async (item) => {
  return { ...item };
};

exports.handler = async ({ pathParameters, queryStringParameters }) => {
  try {
    const collection = 'miniblocks';
    const key = 'miniBlockHash';
    const { hash } = pathParameters || {};
    let query = queryStringParameters || {};

    const keys = ['from', 'size'];

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
    console.error('miniblocks error', error);
    return response({ status: 503 });
  }
};
