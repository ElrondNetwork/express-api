const axios = require('axios');

const { response } = require('./helpers');

const { network, axiosConfig } = require(`./configs/${process.env.CONFIG}`);

const { gatewayUrl } = require(`./configs/${process.env.CONFIG}`);

exports.handler = async ({ httpMethod, body, path }) => {
  // if (!['mainnet', 'internal'].includes(network)) {
  //   throw new Error('move to gateway hostname');
  // }

  try {
    const { data } = await axios({
      method: httpMethod.toLowerCase(),
      url: gatewayUrl() + path,
      data: body,
      ...axiosConfig,
    });

    return response({ data });
  } catch (error) {
    let status = 200;
    let data;

    if (error.response) {
      status = error.response.status;
      data = error.response.data;
    } else if (error.request) {
      status = 500;
    } else {
      status = 503;
    }

    return response({ status, data });
  }
};
