const { axios } = require('./helpers');

const {
  elasticSearch: { getList, getCount },
  response,
} = require('./helpers');

const { elasticUrl, gatewayUrl } = require('./configs/config');

const transformItem = async (item) => {
  // eslint-disable-next-line no-unused-vars
  const { balanceNum, ...rest } = item;
  return { ...rest };
};

exports.handler = async ({ pathParameters, queryStringParameters }) => {
  try {
    const collection = 'accounts';
    const key = 'address';
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
        data = await getCount({ collection, query, condition });
        break;
      }
      case hash !== undefined: {
        try {
          const [
            {
              data: { count: txCount },
            },
            {
              data: {
                data: {
                  account: { address, nonce, balance, code, codeHash, rootHash },
                },
              },
            },
          ] = await Promise.all([
            axios.post(`${elasticUrl()}/transactions/_count`, {
              query: {
                bool: { should: [{ match: { sender: hash } }, { match: { receiver: hash } }] },
              },
            }),
            axios.get(`${gatewayUrl()}/address/${hash}`),
          ]);
          data = { address, nonce, balance, code, codeHash, rootHash, txCount };
        } catch (error) {
          status = 404;
        }
        break;
      }
      default: {
        const sort = {
          balanceNum: 'desc',
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
    console.error('accounts error', error);
    return response({ status: 503 });
  }
};
