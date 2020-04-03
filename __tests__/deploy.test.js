const fs = require('fs');
const S3 = require('./mock/s3');
const deploy = require('../src/deploy');

describe('deploy', () => {

  let mockLog;
  let mockS3;

  const uploads = [ 'a.txt', 'c' ];
  const deletes = [ 'b.txt' ];
  const localPrefix = `${__dirname}/mock/local-filesystem`;

  beforeAll(() => {
    mockLog = jest.spyOn(console, 'log').mockImplementation(jest.fn());
    mockS3 = new S3();
  });

  afterAll(() => {
    mockLog.mockRestore();
  });

  test('it deploys', async () => {

    expect.assertions(2);

    return deploy(mockS3, 'foo', uploads, deletes, localPrefix).then(({ uploaded, deleted }) => {

      expect(uploaded).toEqual([ 'a.txt', 'c' ]);
      expect(deleted).toEqual([ 'b.txt' ]);

    });

  });

  test('it deploys into destination prefix as instructed', async () => {

    expect.assertions(2);

    return deploy(mockS3, 'foo', uploads, deletes, localPrefix, 'some/nested/folder').then(({ uploaded, deleted }) => {

      expect(uploaded).toEqual([ 'some/nested/folder/a.txt', 'some/nested/folder/c' ]);
      expect(deleted).toEqual([ 'some/nested/folder/b.txt' ]);

    });

  });

  test('it sends the correct delete params', async () => {

    expect.assertions(2);

    return deploy(mockS3, 'foo', uploads, deletes, localPrefix).then(({ deleted }) => {

      expect(mockS3.lastDeleteParams.Bucket).toEqual('foo');
      expect(mockS3.lastDeleteParams.Delete.Objects).toEqual(deleted.map((Key) => ({ Key })));

    });

  });

  test('it sends the correct upload params', async () => {

    expect.assertions(6);

    return deploy(mockS3, 'foo', uploads, deletes, localPrefix).then(({ uploaded }) => {

      expect(mockS3.lastUploadParams.ACL).toBeUndefined();
      expect(mockS3.lastUploadParams.Body).toBeInstanceOf(fs.ReadStream);
      expect(mockS3.lastUploadParams.CacheControl).toBe('315360001');
      expect(mockS3.lastUploadParams.ContentLength).toBe(171);
      expect(mockS3.lastUploadParams.ContentType).toBe('text/html');
      expect(mockS3.lastUploadParams.Key).toBe(uploaded[1]);

    });

  });

  test('it sends the correct upload params with custom behaviour', async () => {

    expect.assertions(6);

    return deploy(mockS3, 'foo', uploads, deletes, localPrefix, '', 'public-read', [ uploads[0] ]).then(({ uploaded }) => {

      expect(mockS3.lastUploadParams.ACL).toBe('public-read');
      expect(mockS3.lastUploadParams.Body).toBeInstanceOf(fs.ReadStream);
      expect(mockS3.lastUploadParams.CacheControl).toBe('315360001');
      expect(mockS3.lastUploadParams.ContentLength).toBe(171);
      expect(mockS3.lastUploadParams.ContentType).toBe('text/html');
      expect(mockS3.lastUploadParams.Key).toBe(uploaded[1]);

    });

  });

});
