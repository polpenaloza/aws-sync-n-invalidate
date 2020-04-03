const { info, warn } = require('./log');

module.exports = async (local, remote, ignoreDeleted = true) => {

  const added = [];
  const modified = [];
  const deleted = [];

  Object.entries(local).forEach(([ key, checksum ]) => {
    const modKey = key.split('.html')[0];
    if (!(modKey in remote)) {
      info(`New file ${modKey} will be uploaded`);
      added.push(modKey);
    } else if (checksum !== remote[modKey]) {
      info(`Modified file ${modKey} will be uploaded`);
      modified.push(modKey);
    }
  });

  if (!ignoreDeleted) {
    Object.keys(remote).filter((key) => !(key in local)).forEach((key) => {
      warn(`Deleted file ${key} will be removed`);
      deleted.push(key);
    });
  }

  if (!added.length && !modified.length && !deleted.length) {
    info('No changes detected');
  }

  return {
    added,
    modified,
    deleted,
  };

};
