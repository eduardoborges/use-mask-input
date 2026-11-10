import { browserDriver } from './driver.browser';
import { browserFixtures } from './fixtures.browser';
import { defineParitySuite } from './runner';

defineParitySuite({ driver: browserDriver, fixtures: browserFixtures });
