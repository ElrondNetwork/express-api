const { getList, getItem, getCount } = require('../../helpers/elasticSearch');
jest.mock('../../helpers/axiosWrapper', () => {
  return {
    axios: {
      post: jest.fn((url) => {
        if (url.includes('_search')) {
          return {
            data: {
              hits: {
                hits: [
                  {
                    _id: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
                    _source: { balance: '6255017500000000000000000', nonce: 1 },
                  },
                ],
              },
            },
          };
        } else {
          return {
            data: { count: 362125 },
          };
        }
      }),
      get: jest.fn(() => ({
        data: {
          _id: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
          _source: { balance: '6255017500000000000000000', nonce: 1 },
        },
      })),
    },
  };
});

describe(`Test elasticSearch helper`, () => {
  let collection = 'accounts';
  let hash = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l';
  let key = 'address';
  let query = {};
  let sort = {};
  let condition = 'must';

  test('Test getList helper', async () => {
    const helperResponse = await getList({ collection, key, query, sort, condition });
    const responseObject = [
      {
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        balance: '6255017500000000000000000',
        nonce: 1,
      },
    ];
    expect(JSON.stringify(helperResponse)).toBe(JSON.stringify(responseObject));
  });

  test('Test getItem helper', async () => {
    const helperResponse = await getItem({ collection, key, hash });
    const responseObject = {
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
      balance: '6255017500000000000000000',
      nonce: 1,
    };
    expect(helperResponse).toMatchObject(responseObject);
  });

  test('Test getCount helper', async () => {
    const helperResponse = await getCount({ collection, query, condition });
    expect(helperResponse).toBe(362125);
  });
});
