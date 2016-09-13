var proxyquire = require('proxyquire');
var should     = require('should');
var sinon      = require('sinon');

var myPrivateKey = '97811b691dd7ebaeb67977d158e1da2c4d3eaa4ee4e2555150628acade6b344c';

describe('RESTClient', function() {

  var isWin = (process.platform === 'win32' || process.platform === 'win64');
  var HOME = process.env[isWin ? 'USERPROFILE' : 'HOME'];
  var configFile = HOME + '/.bitpay/config.json';
  var stubs = {};
  stubs.request = sinon.stub().returnsArg(0).callsArgWithAsync(1, null, {
      statusCode: 200
    }, '{ "data": [{}] }');
  stubs[configFile] = {
    apiHost: 'fileApiHost',
    apiPort: '7777',
    forceSSL: 'true', '@noCallThru': true
  };
  var RESTClient = proxyquire('../lib/rest-client', stubs);
  describe('#new', function() {

    it('should create an instance of the client without a secret', function(done) {
      var client = new RESTClient();
      client.defaults.getTokens.should.equal(false);
      client.defaults.signRequests.should.equal(false);
      client.on('ready', done);
    });

    it('should create an instance of the client with a secret', function(done) {
      var client = new RESTClient( myPrivateKey );
      client.defaults.getTokens.should.equal(true);
      client.defaults.signRequests.should.equal(true);
      client.on('ready', done);
    });

    it('should override default configuration if provided', function(done) {
      var client = new RESTClient( myPrivateKey , {
        config: {
          apiHost: 'myhost',
          apiPort: 'myport',
          forceSSL: false
        }
      });
      client.apiHost.should.equal('myhost');
      client.apiPort.should.equal('myport');
      done();
    });

    it('should use environment variables for default configuration, if provided', function() {
      process.env.BITPAY_API_HOST = 'envApiHost';
      process.env.BITPAY_API_PORT = '9999';
      var client = new RESTClient( myPrivateKey );
      client.apiHost.should.equal('envApiHost');
      client.apiPort.should.equal(9999);
      delete process.env.BITPAY_API_HOST;
      delete process.env.BITPAY_API_PORT;
    });

    it('should use configuration file if no environment variables are specified', function() {
      var client = new RESTClient( myPrivateKey );
      client.apiHost.should.equal('fileApiHost');
      client.apiPort.should.equal('7777');
    });

    it('should use the hard-coded test values if environment variable set for this', function() {
      process.env.USE_BITPAY_TESTNET = 'true';
      var client = new RESTClient( myPrivateKey );
      client.apiHost.should.equal('test.bitpay.com');
      client.apiPort.should.equal(443);
      delete process.env.USE_BITPAY_TESTNET;
    });

    it('should use a combination of environment variables and file parameters', function() {
      process.env.BITPAY_API_PORT = 999;
      var client = new RESTClient( myPrivateKey );
      client.apiHost.should.equal('fileApiHost');
      client.apiPort.should.equal(999);
      delete process.env.BITPAY_API_PORT;
    });
  });

  describe('#as', function() {

    it('should change the client facade', function(done) {
      var client = new RESTClient( myPrivateKey );
      client.as('public').facade.should.equal('public');
      done();
    });

    it('should reset the client facade after request', function(done) {
      var client = new RESTClient( myPrivateKey );
      client.as('public').get('rates', function(err, data) {
        should.not.exist(err);
        client.facade.should.equal('merchant');
        done();
      });
    });

  });

  describe('#_sendRequest', function() {

    it('should sign the request if a secret is given', function(done) {
      var request = new RESTClient( myPrivateKey ).get('rates');
      should.exist(request.headers['x-identity']);
      should.exist(request.headers['x-signature']);
      done();
    });

    it('should send the GET verb using client.get()', function(done) {
      var request = new RESTClient().get('rates');
      request.method.should.equal('GET');
      done();
    });

    it('should send the PUT verb using client.put()', function(done) {
      var request = new RESTClient().put('rates');
      request.method.should.equal('PUT');
      done();
    });

    it('should send the POST verb using client.post()', function(done) {
      var request = new RESTClient().post('rates');
      request.method.should.equal('POST');
      done();
    });

    it('should send the DELETE verb using client.delete()', function(done) {
      var request = new RESTClient().delete('rates');
      request.method.should.equal('DELETE');
      done();
    });

    it('should not include "?" in dataToSign without data', function(done) {
      var request = new RESTClient();
      request.facade = 'user';
      request._sendRequest('GET', 'tokens', function(err, data){
        request._dataToSign.should.not.match(/\?$/);
        done();
      });
    });

  });

  describe('#_processResponse', function() {

    it('should extend the response with new verb methods', function(done) {
      var client = new RESTClient();
      client.get('rates', function(err, data) {
        should.not.exist(err);
        data[0].get.should.be.type('function');
        data[0].put.should.be.type('function');
        data[0].post.should.be.type('function');
        data[0].delete.should.be.type('function');
        done();
      });
    });

  });

  describe('#_createGuid', function() {

    it('should create a proper guid', function(done) {
      var client = new RESTClient();
      client._createGuid().should.have.length(36);
      done();
    });

  });

});
