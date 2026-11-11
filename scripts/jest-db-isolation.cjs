'use strict';

const { applyTestDatabaseIsolation } = require('./hosted-db-guard');

// Runs before each Jest test file is loaded, so a hosted URL cannot be read
// by a test (or by a module it imports) and turned into a connection.
applyTestDatabaseIsolation(process.env);
