const S3 = require('./mock/s3');
const fetch = require('../src/fetch');

describe('fetch', () => {

  let mockLog;
  let mockS3;

  const localPrefix = `${__dirname}/mock/local-filesystem`;

  beforeAll(() => {
    mockLog = jest.spyOn(console, 'log').mockImplementation(jest.fn());
    mockS3 = new S3();
  });

  afterAll(() => {
    mockLog.mockRestore();
  });

  test('it fetches', async () => {

    expect.assertions(2);

    return fetch(mockS3, 'foo', localPrefix).then(({ local, remote }) => {

      expect(local).toEqual({
        'a.txt': 'd41d8cd98f00b204e9800998ecf8427e',
        'c': 'a53ebd7a007cc99cc827e7e03f44f206',
        'c.html': 'a53ebd7a007cc99cc827e7e03f44f206'
      });
      expect(remote).toEqual({
        'a.txt': 'abc123',
        'c': 'abc123',
        'c.html': 'abc123',
      });

    });

  });

  test('it sends the correct params', async () => {

    expect.assertions(2);

    return fetch(mockS3, 'foo', localPrefix, 'some/nested/path').then(() => {

      expect(mockS3.lastListObjectsV2Params.Bucket).toEqual('foo');
      expect(mockS3.lastListObjectsV2Params.Prefix).toEqual('some/nested/path/');

    });

  });

});
