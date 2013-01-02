/*
 * sqlServer-test.js: Tests for azure SQL servers
 *
 * (C) Microsoft Open Technologies, Inc.
 *
 */

var IP_DETECT_RULE_NAME = 'ipDetectRuleName';
var TEST_RULE_NAME = 'testRuleName';
var TEST_IP_ADDRESS_START = '192.168.1.1';
var TEST_IP_ADDRESS_END = '192.168.1.2';

var vows    = require('vows'),
  helpers = require('../../helpers'),
  assert  = require('../../helpers/assert'),
  nock    = require('nock');

var config = helpers.loadConfig('azure');
config.dbType= 'AZURE_SQL'

var client = helpers.createClient('azure', 'database', config),
  testContext = {};

if (process.env.NOCK) {

  nock('https://management.database.windows.net:8443')
    .filteringRequestBody(/.*/, '*')
    .post('/azure-account-subscription-id/servers', '*')
    .reply(201, '﻿<ServerName xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\">npm0lusisu</ServerName>')
    .get('/azure-account-subscription-id/servers')
    .reply(200, '﻿<Servers xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\">\r\n  <Server>\r\n    <Name>npm0lusisu</Name>\r\n    <AdministratorLogin>foo</AdministratorLogin>\r\n    <Location>North Central US</Location>\r\n  </Server>\r\n</Servers>')
    .delete("/azure-account-subscription-id/servers/npm0lusisu")
    .reply(200, "", {'content-length': '0'});

  // sql server firewall rules
  nock('https://management.database.windows.net:8443')
    .post('/azure-account-subscription-id/servers/npm0lusisu/firewallrules/ipDetectRuleName?op=AutoDetectClientIP')
    .reply(200, "﻿<IpAddress xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\">98.232.61.224</IpAddress>", {})
    .get('/azure-account-subscription-id/servers/npm0lusisu/firewallrules')
    .reply(200, "﻿<FirewallRules xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\">\r\n  <FirewallRule>\r\n    <Name>ipDetectRuleName</Name>\r\n    <StartIpAddress>98.232.61.224</StartIpAddress>\r\n    <EndIpAddress>98.232.61.224</EndIpAddress>\r\n  </FirewallRule>\r\n</FirewallRules>", {})
    .delete('/azure-account-subscription-id/servers/npm0lusisu/firewallrules/ipDetectRuleName')
    .reply(200, "", { })
    .get('/azure-account-subscription-id/servers/npm0lusisu/firewallrules')
    .reply(200, "﻿<FirewallRules xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\" />", {})
    .put('/azure-account-subscription-id/servers/npm0lusisu/firewallrules/testRuleName', '<?xml version=\"1.0\" encoding=\"utf-8\"?><FirewallRule xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://schemas.microsoft.com/sqlazure/2010/12/FirewallRule.xsd\"><StartIpAddress>192.168.1.1</StartIpAddress><EndIpAddress>192.168.1.2</EndIpAddress></FirewallRule>')
    .reply(200, "",  {})
    .get('/azure-account-subscription-id/servers/npm0lusisu/firewallrules')
    .reply(200, "﻿<FirewallRules xmlns=\"http://schemas.microsoft.com/sqlazure/2010/12/\">\r\n  <FirewallRule>\r\n    <Name>testRuleName</Name>\r\n    <StartIpAddress>192.168.1.1</StartIpAddress>\r\n    <EndIpAddress>192.168.1.2</EndIpAddress>\r\n  </FirewallRule>\r\n</FirewallRules>", {});



}

vows.describe('pkgcloud/azure/databases').addBatch({
  "The pkgcloud azure SQL Server client": {
    "the create() method": {
      "with correct options": {
        topic: function () {
          client.create({
            dbUsername: 'testdb',
            dbPassword: 'Testing!!',
            dbLocation: 'North Central US'
          }, this.callback);
        },
        "should respond correctly": function (err, database) {
          assert.isNull(err);
          assert.ok(database.id);
          assert.ok(database.uri);
          testContext.databaseId = database.id;
        }
      },
      "with invalid options like": {
        "no options": {
          topic: function () {
            client.create(this.callback);
          },
          "should respond with errors": assert.assertError
        },
        "invalid options": {
          topic: function () {
            client.create({ invalid:'keys' }, this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }
}).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the list() method": {
        "with correct options": {
          topic: function () {
            client.list(this.callback);
          },
          "should respond correctly": function (err, result) {
            assert.isNull(err);
            assert.isArray(result);
            assert.ok(result.length > 0);
          }
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the createServerFirewallRuleWithIPDetect() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId, ruleName: IP_DETECT_RULE_NAME};
            client.createServerFirewallRuleWithIPDetect(options, this.callback);
          },
          "should respond correctly": function (err, result) {
            assert.isNull(err);
            assert.isObject(result);
            assert.isString(result.ipAddress);
            assert.equal(result.statusCode,200);
            assert.equal(result.ruleName,IP_DETECT_RULE_NAME);
          }
        },
        "without options": {
          topic: function () {
            client.createServerFirewallRuleWithIPDetect(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the listServerFirewallRules() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId};
            client.listServerFirewallRules(options, this.callback);
          },
          "should respond correctly": function (err, results) {
            assert.isNull(err);
            assert.isArray(results);
            assert.ok(results.length > 0);
            assert.equal(results[0].ruleName, IP_DETECT_RULE_NAME);
            assert.isString(results[0].startIpAddress);
            assert.isString(results[0].endIpAddress);
            assert.equal(results[0].startIpAddress, results[0].endIpAddress);
          }
        },
        "without options": {
          topic: function () {
            client.listServerFirewallRules(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the deleteFirewallRule() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId, ruleName: IP_DETECT_RULE_NAME};
            client.deleteFirewallRule(options, this.callback);
          },
          "should respond correctly": function (err, result) {
            assert.isNull(err);
            assert.equal(result.statusCode,200);
          }
        },
        "without options": {
          topic: function () {
            client.deleteFirewallRule(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the listServerFirewallRules() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId};
            client.listServerFirewallRules(options, this.callback);
          },
          "should respond correctly": function (err, results) {
            assert.isNull(err);
            assert.isArray(results);
            assert.ok(results.length === 0);
          }
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the createServerFirewallRule() method": {
        "with correct options": {
          topic: function () {
            options = {
              id: testContext.databaseId,
              ruleName: TEST_RULE_NAME,
              startIpAddress: TEST_IP_ADDRESS_START,
              endIpAddress: TEST_IP_ADDRESS_END
            };
            client.createServerFirewallRule(options, this.callback);
          },
          "should respond correctly": function (err, result) {
            assert.isNull(err);
            assert.isObject(result);
            assert.equal(result.statusCode,200);
          }
        },
        "without options": {
          topic: function () {
            client.createServerFirewallRule(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the listServerFirewallRules() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId};
            client.listServerFirewallRules(options, this.callback);
          },
          "should respond correctly": function (err, results) {
            assert.isNull(err);
            assert.isArray(results);
            assert.ok(results.length === 1);
            assert.equal(results[0].serverId, testContext.databaseId);
            assert.equal(results[0].ruleName, TEST_RULE_NAME);
            assert.isString(results[0].startIpAddress);
            assert.isString(results[0].endIpAddress);
            assert.equal(results[0].startIpAddress, TEST_IP_ADDRESS_START);
            assert.equal(results[0].endIpAddress, TEST_IP_ADDRESS_END);
          }
        },
        "without options": {
          topic: function () {
            client.listServerFirewallRules(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }).addBatch({
    "The pkgcloud azure SQL Server client": {
      "the remove() method": {
        "with correct options": {
          topic: function () {
            options = {id: testContext.databaseId};
            client.remove(options, this.callback);
          },
          "should respond correctly": function (err, result) {
            assert.isNull(err);
            assert.equal(result.statusCode,200);
          }
        },
        "without options": {
          topic: function () {
            client.remove(this.callback);
          },
          "should respond with errors": assert.assertError
        }
      }
    }
  }
).export(module);
