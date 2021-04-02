const { axios } = require('./axiosWrapper');
const { elasticUrl } = require('../configs/config');

const buildQuery = (query, condition = {}) => {
  delete query.from;
  delete query.size;

  const { before, after } = query;
  delete query.before;
  delete query.after;
  const range = buildRange({ before, after });

  if (Object.keys(query).length) {
    const matchQuery = Object.keys(query).map((key) => {
      const match = {};
      match[key] = query[key];

      return { match };
    });

    switch (condition) {
      case 'should':
        query = { bool: { should: matchQuery } };
        break;
      default:
        query = { bool: { must: matchQuery } };
    }
  } else if (Object.keys(range.timestamp).length != 0) {
    query.range = range;
  } else {
    query = { match_all: {} };
  }

  return query;
};

const buildSort = (sort = {}) => {
  sort = Object.keys(sort).map((key) => {
    const obj = {};
    obj[key] = {};
    obj[key].order = sort[key];

    return obj;
  });

  return sort;
};

const buildRange = (range = {}) => {
  let obj = {};
  obj.timestamp = {};
  Object.keys(range).map((key) => {
    if (key == 'before' && range[key] != undefined) {
      obj.timestamp.lte = range[key];
    }
    if (key == 'after' && range[key] != undefined) {
      obj.timestamp.gte = range[key];
    }
  });
  return obj;
};

const formatItem = ({ document, key }) => {
  const { _id, _source } = document;
  const item = {};
  item[key] = _id;

  return { ...item, ..._source };
};

const getList = async ({ collection, key, query, sort, condition }) => {
  const url = `${elasticUrl()}/${collection}/_search`;
  const { from = 0, size = 25 } = query;
  query = buildQuery(query, condition);
  sort = buildSort(sort);

  const {
    data: {
      hits: { hits: documents },
    },
  } = await axios.post(url, { query, sort, from, size });

  return documents.map((document) => formatItem({ document, key }));
};

const getItem = async ({ collection, key, hash }) => {
  const url = `${elasticUrl()}/${collection}/_doc/${hash}`;
  const { data: document } = await axios.get(url);

  return formatItem({ document, key });
};

const getCount = async ({ collection, query, condition }) => {
  const url = `${elasticUrl()}/${collection}/_count`;
  query = buildQuery(query, condition);

  const {
    data: { count },
  } = await axios.post(url, { query });

  return count;
};

const publicKeysCache = {};

const getPublicKeys = async ({ shard, epoch }) => {
  const key = `${shard}_${epoch}`;

  if (publicKeysCache[key]) {
    return publicKeysCache[key];
  }

  const url = `${elasticUrl()}/validators/_doc/${key}`;

  const {
    data: {
      _source: { publicKeys },
    },
  } = await axios.get(url);

  publicKeysCache[key] = publicKeys;

  return publicKeys;
};

module.exports = {
  getList,
  getItem,
  getCount,
  getPublicKeys,
};
