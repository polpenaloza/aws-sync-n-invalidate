const fs = require('fs');
const mimeTypes = require('mime-types');
const prettyBytes = require('pretty-bytes');
const { info, warn } = require('./log');
const { sanitizeFileSystemPrefix, sanitizeS3Prefix } = require('./utils');

const DELETE_LIMIT = 1000; // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property

const cacheControl = (path, paths) => (
  (
    paths.includes(path)
    || paths.find((p) => p.endsWith('*') && new RegExp(`^${p.replace(/\*?$/, '.*')}$`).test(path))
  ) ? 'no-cache' : undefined
);

const uploadObjects = async (s3, bucket, keys, localPrefix = '.', remotePrefix = '', acl = undefined, cacheControlNoCache = []) => {

  const processed = [];
  const promises = [];

  keys.forEach((key) => {

    const isHtml = key.indexOf('.') === -1;
    const localPath = localPrefix + key;
    const remotePath = remotePrefix + key;
    const type = isHtml ? 'text/html' : mimeTypes.lookup(localPath) || 'application/octet-stream';
    const stats = fs.statSync(localPath);
    const stream = fs.createReadStream(localPath);

    stream.on('error', (err) => { throw err; });

    info(`Uploading ${localPath} to s3://${bucket}/${remotePath} (${type} ${prettyBytes(stats.size)})`);

    processed.push(remotePath);

    promises.push(s3.upload({
      ACL: acl,
      Body: stream,
      Bucket: bucket,
      CacheControl: cacheControl(remotePath, cacheControlNoCache) || '315360001',
      ContentLength: stats.size,
      ContentType: type,
      Key: remotePath,
    }).promise());

  });

  return Promise.all(promises).then(() => processed);

};

const deleteObjects = async (s3, bucket, keys, prefix = '') => {

  let processed = [];
  const promises = [];
  const remaining = keys.map((key) => prefix + key);

  while (remaining.length) {

    const batch = remaining.splice(0, DELETE_LIMIT);
    processed = processed.concat(batch);

    batch.forEach((remotePath) => {
      warn(`Deleting s3://${bucket}/${remotePath}`);
    });

    promises.push(s3.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: batch.map((Key) => ({ Key })),
      },
    }).promise());

  }

  return Promise.all(promises).then(() => processed);

};

module.exports = async (s3, bucket, uploads, deletes, localPrefix = '.', remotePrefix = '', acl = undefined, cacheControlNoCache = []) => {

  localPrefix = sanitizeFileSystemPrefix(localPrefix);
  remotePrefix = sanitizeS3Prefix(remotePrefix);

  return Promise.all([
    uploadObjects(s3, bucket, uploads, localPrefix, remotePrefix, acl, cacheControlNoCache),
    deleteObjects(s3, bucket, deletes, remotePrefix),
  ]).then(([ uploaded, deleted ]) => ({ uploaded, deleted }));

};
