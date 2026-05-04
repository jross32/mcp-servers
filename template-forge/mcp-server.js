'use strict';
const config = require('./server-config.json');
const { runGeneratedServer } = require('../mcp-factory/runtime');
runGeneratedServer(config);
