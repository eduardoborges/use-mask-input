import { jsdomDriver } from './driver.jsdom';
import { nodeFixtures } from './fixtures.node';
import { defineParitySuite } from './runner';

defineParitySuite({ driver: jsdomDriver, fixtures: nodeFixtures });
