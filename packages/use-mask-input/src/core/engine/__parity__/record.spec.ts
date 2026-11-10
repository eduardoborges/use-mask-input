import { jsdomDriver } from './driver.jsdom';
import { nodeFixtures } from './fixtures.node';
import { defineRecordSuite } from './runner';

// Does nothing unless PARITY_RECORD is set.
defineRecordSuite({ driver: jsdomDriver, fixtures: nodeFixtures });
