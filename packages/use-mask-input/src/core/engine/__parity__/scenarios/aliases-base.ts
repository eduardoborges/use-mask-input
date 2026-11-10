import {
  blur, chars, focus, interactive, mask, paste, press, staticCase, typing,
} from '../scenario';

import type { Scenario } from '../types';

/** The aliases of upstream's base extension: email, url, ip, mac, ssn, vin, cssunit. */

const EMAILS = [
  '',
  'a',
  'john',
  'john@',
  'john@doe',
  'john@doe.com',
  'john.doe@mail.example.com',
  'JOHN@DOE.COM',
  'mailto:john@doe.com',
  'john doe@x.com',
  'a@b.c',
  '@',
  'john@@doe.com',
  'j.o.h.n@d.o.e',
  'first.last+tag@sub.domain.org',
  `${'x'.repeat(70)}@d.com`,
  'ünï@cödé.com',
];

const URLS = [
  '',
  'h',
  'http',
  'http://',
  'https://example.com',
  'https://example.com/path?q=1#frag',
  'ftp://files.example.com/a b',
  'example.com',
  'HTTP://X',
  'htp://x',
  'ftps://x',
];

const IPS = [
  '',
  '1',
  '192',
  '192.168',
  '192.168.1.1',
  '255.255.255.255',
  '256.1.1.1',
  '1.2.3.4.5',
  '19216811',
  '1,2,3,4',
  'a.b.c.d',
  '0.0.0.0',
  '99.99.99.99',
  '192.168.001.001',
  '300',
  '2555',
];

const MACS = [
  '',
  'aa',
  'aabbccddeeff',
  'AA:BB:CC:DD:EE:FF',
  '00:1a:2b:3c:4d:5e',
  'gg:hh',
  '0123456789ab',
  'aa-bb-cc-dd-ee-ff',
];

const SSNS = [
  '',
  '123',
  '123456789',
  '123-45-6789',
  '000-12-3456',
  '666-12-3456',
  '900-12-3456',
  '123-00-4567',
  '123-45-0000',
  '078-05-1120',
  '219-09-9999',
  '12345678a',
];

const VINS = [
  '',
  '1HGCM82633A004352',
  '1hgcm82633a004352',
  'IOQ',
  '1HGCM82633A00435',
  '1HGCM82633A0043521',
  'JH4KA8260MC000000',
  '12345678901234567',
];

const CSS_UNITS = [
  '',
  '10',
  '10px',
  '-5em',
  '+1.5rem',
  '100%',
  '10 px',
  'px',
  '1.',
  '.5px',
  '12pt',
  '3cm',
  '10xx',
  '1e3px',
];

export const scenarios: Scenario[] = [
  staticCase('alias/email/static', { alias: 'email' }, EMAILS),
  staticCase('alias/email/separator', { alias: 'email', separator: ';', quantifier: 2 }, [
    ...EMAILS, 'a@b.c;d@e.f', 'a@b.c;d@e.f;g@h.i', 'a@b.c;',
  ]),
  staticCase('alias/url/static', { alias: 'url' }, URLS),
  staticCase('alias/ip/static', { alias: 'ip' }, IPS),
  staticCase('alias/ip/greedy', { alias: 'ip', greedy: true }, IPS),
  staticCase('alias/mac/static', { alias: 'mac' }, MACS),
  staticCase('alias/ssn/static', { alias: 'ssn' }, SSNS),
  staticCase('alias/vin/static', { alias: 'vin' }, VINS),
  staticCase('alias/cssunit/static', { alias: 'cssunit' }, CSS_UNITS),

  typing('alias/email/typing', { alias: 'email' }, 'John.Doe@Mail.com'),
  typing('alias/email/typing-skip-at', { alias: 'email' }, 'a@@b..c'),
  typing('alias/url/typing', { alias: 'url' }, 'https://ex.io/a'),
  typing('alias/url/typing-invalid-scheme', { alias: 'url' }, 'xtp://a'),
  typing('alias/ip/typing', { alias: 'ip' }, '192.168.1.10'),
  typing('alias/ip/typing-auto-dot', { alias: 'ip' }, '19216811'),
  typing('alias/ip/typing-comma', { alias: 'ip' }, '10,0,0,1'),
  typing('alias/ip/typing-greedy', { alias: 'ip', greedy: true }, '2552552552'),
  typing('alias/mac/typing', { alias: 'mac' }, 'aabbccddeeff'),
  typing('alias/mac/typing-invalid', { alias: 'mac' }, 'ag1z'),
  typing('alias/ssn/typing', { alias: 'ssn' }, '123456789'),
  typing('alias/ssn/typing-rejected-area', { alias: 'ssn' }, '666123456'),
  typing('alias/vin/typing', { alias: 'vin' }, '1hgcm82633a004352'),
  typing('alias/vin/typing-incomplete', { alias: 'vin' }, '1hgcm'),
  typing('alias/cssunit/typing', { alias: 'cssunit' }, '-12.5rem'),
  typing('alias/cssunit/typing-percent', { alias: 'cssunit' }, '100%'),

  interactive('alias/email/paste-mailto', { alias: 'email' }, [
    mask(), focus(), paste('mailto:John@Doe.com'), blur(),
  ]),
  interactive('alias/url/tab-through', { alias: 'url' }, [
    mask(), focus(), chars('http://a'), press('Tab'), press('Tab', { shift: true }), blur(),
  ]),
  interactive('alias/vin/blur-clears-incomplete', { alias: 'vin' }, [
    mask(), focus(), chars('1HG'), blur(), focus(), chars('1HGCM82633A004352'), blur(),
  ]),
];
