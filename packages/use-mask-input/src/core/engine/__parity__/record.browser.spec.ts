import { browserDriver } from './driver.browser';
import { browserFixtures } from './fixtures.browser';
import { defineRecordSuite } from './runner';

// Does nothing unless PARITY_RECORD is set.
defineRecordSuite({ driver: browserDriver, fixtures: browserFixtures });
