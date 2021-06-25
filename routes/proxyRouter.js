const express = require('express');
const router = express.Router();
const { proxyhandler } = require('../handlers');

router.get(
  [
    '/address/:address',
    '/address/:address/balance',
    '/address/:address/nonce',
    '/address/:address/shard',
    '/address/:address/storage/:key',
    '/address/:address/key/:index',
    '/address/:address/transactions',
    '/address/:address/esdt',
    '/address/:address/esdt/:token',
    '/transaction/:hash',
    '/transaction/:hash/status',
    '/network/status/:shard',
    '/network/config',
    '/network/economics',
    '/network/total-staked',
    '/node/heartbeatstatus',
    '/validator/statistics',
    '/block/:shard/by-nonce/:nonce',
    '/block/:shard/by-hash/:hash',
    '/block-atlas/:shard/:nonce',
    '/hyperblock/by-nonce/:nonce',
    '/hyperblock/by-hash/:hash',
  ],
  async (req, res) => {
    const { body: payload, path } = req;

    const { statusCode, headers, body } = await proxyhandler({
      httpMethod: 'GET',
      body: payload,
      path,
    });

    res.status(statusCode).set(headers).json(body);
  }
);

router.post(
  [
    '/transaction/send',
    '/transaction/simulate',
    '/transaction/send-multiple',
    '/transaction/cost',
    '/vm-values/hex',
    '/vm-values/string',
    '/vm-values/int',
    '/vm-values/query',
  ],
  async (req, res) => {
    const { body: payload, path } = req;

    const { statusCode, headers, body } = await proxyhandler({
      httpMethod: 'POST',
      body: payload,
      path,
    });

    res.status(statusCode).set(headers).json(body);
  }
);

module.exports = router;
