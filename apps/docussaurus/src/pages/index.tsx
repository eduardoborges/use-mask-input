import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocusaurusCodeBlock from '@theme/CodeBlock';
import styles from './index.module.css';

const FALLBACK_WEEKLY = 85000;
const FALLBACK_GZIP_BYTES = 34_000;
const FALLBACK_STARS = 100;

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k+`;
  return n.toLocaleString('en-US');
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)}mb`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}kb`;
  return `${n}b`;
}

function useGithubStars(repo: string): RemoteValue {
  const [state, setState] = useState<RemoteValue>({ value: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const value =
          data && typeof data.stargazers_count === 'number'
            ? data.stargazers_count
            : null;
        setState({ value, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ value: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return state;
}

function useGzipSize(pkg: string): RemoteValue {
  const [state, setState] = useState<RemoteValue>({ value: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`https://deno.bundlejs.com/?q=${encodeURIComponent(pkg)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const raw = data?.size?.rawCompressedSize;
        const value = typeof raw === 'number' ? raw : null;
        setState({ value, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ value: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return state;
}

type RemoteValue = { value: number | null; loading: boolean };

function useWeeklyDownloads(pkg: string): RemoteValue {
  const [state, setState] = useState<RemoteValue>({ value: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.npmjs.org/downloads/point/last-week/${pkg}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const value =
          data && typeof data.downloads === 'number' ? data.downloads : null;
        setState({ value, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ value: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [pkg]);

  return state;
}

const INSTALL = 'npm install use-mask-input';

const BASIC_EXAMPLE = `import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const ref = useMaskInput({ mask: '(99) 99999-9999' });
  return <input ref={ref} />;
}`;

const HOOK_FORM_EXAMPLE = `import { useForm } from 'react-hook-form';
import { useHookFormMask } from 'use-mask-input';

function MyForm() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMask(register);

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...registerWithMask('phone', '(99) 99999-9999')} />
      <input {...registerWithMask('email', 'email')} />
      <button type="submit">Submit</button>
    </form>
  );
}`;

function MeshGradient() {
  return (
    <div className={styles.mesh} aria-hidden="true">
      <div className={styles.meshBlob1} />
      <div className={styles.meshBlob2} />
      <div className={styles.meshBlob3} />
    </div>
  );
}

function Hero() {
  return (
    <header className={styles.hero}>
      <MeshGradient />
      <div className={styles.heroInner}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          v3 · React 19 ready
        </div>

        <h1 className={styles.heroTitle}>
          Stop fighting with input masks in React. 🤯
        </h1>

        <p className={styles.heroSubtitle}>
          A tiny hook for elegant input masking. Works with plain inputs,
          React Hook Form, TanStack Form, and Ant Design.
        </p>

        <div className={styles.installRow}>
          <pre className={styles.install}>
            <span className={styles.installPrompt}>$</span>
            <code>{INSTALL}</code>
          </pre>
        </div>

        <div className={styles.heroButtons}>
          <Link className={clsx('button button--primary button--lg', styles.cta)} to="/intro">
            Get started
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.cta)}
            to="/api-reference"
          >
            API reference
          </Link>
          <Link
            className={clsx('button button--secondary button--lg', styles.cta)}
            href="https://github.com/eduardoborges/use-mask-input"
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function Examples() {
  return (
    <section className={styles.examples}>
      <div className={styles.examplesInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>// drop-in</span>
          <h2 className={styles.sectionTitle}>Copy. Paste. Mask.</h2>
          <p className={styles.sectionLead}>
            One hook, predictable refs, and a familiar API. No wrapper
            components, no custom inputs to learn.
          </p>
        </div>

        <div className={styles.examplesGrid}>
          <div className={styles.codeCard}>
            <DocusaurusCodeBlock language="tsx" title="basic.tsx">
              {BASIC_EXAMPLE}
            </DocusaurusCodeBlock>
          </div>
          <div className={styles.codeCard}>
            <DocusaurusCodeBlock language="tsx" title="with-react-hook-form.tsx">
              {HOOK_FORM_EXAMPLE}
            </DocusaurusCodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: 'Lightweight',
      body: 'A thin React layer over Inputmask — the only runtime dependency. No wrappers, no extra abstractions.',
    },
    {
      title: 'Composable',
      body: 'Plain refs, React Hook Form, TanStack Form, Ant Design — pick any.',
    },
    {
      title: 'Typed',
      body: 'First-class TypeScript. Mask presets, options, and refs all inferred.',
    },
    {
      title: 'Accessible',
      body: 'Native input under the hood — screen readers, autofill, validation just work.',
    },
  ];

  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>// why</span>
          <h2 className={styles.sectionTitle}>Built for the boring parts.</h2>
        </div>

        <div className={styles.featuresGrid}>
          {items.map((item) => (
            <div key={item.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{item.title}</h3>
              <p className={styles.featureBody}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatValue({ value, loading }: { value: string; loading: boolean }) {
  return (
    <div className={styles.statValue}>
      {loading ? (
        <span className={styles.skeleton} aria-label="loading" />
      ) : (
        value
      )}
    </div>
  );
}

function Sponsors() {
  return (
    <section className={styles.sponsors}>
      <div className={styles.sponsorsInner}>
        <div className={styles.sponsorsCard}>
          <div className={styles.sponsorsCopy}>
            <span className={styles.sectionEyebrow}>// sponsors</span>
            <h2 className={styles.sponsorsTitle}>This spot is empty.</h2>
            <p className={styles.sponsorsLead}>
              use-mask-input is maintained on nights and weekends. If it saves
              your team time, consider sponsoring — your logo lives right here,
              and you help keep the project alive.
            </p>
            <div className={styles.sponsorsCta}>
              <Link
                className={clsx('button button--primary button--lg', styles.cta)}
                href="https://github.com/sponsors/eduardoborges"
              >
                Become a sponsor
              </Link>
              <Link
                className={clsx('button button--secondary button--lg', styles.cta)}
                href="https://github.com/eduardoborges/use-mask-input"
              >
                Star on GitHub
              </Link>
            </div>
          </div>

          <div className={styles.sponsorsSlots} aria-hidden="true">
            <div className={styles.sponsorSlot}>
              <span>your logo</span>
            </div>
            <div className={styles.sponsorSlot}>
              <span>your logo</span>
            </div>
            <div className={styles.sponsorSlot}>
              <span>your logo</span>
            </div>
            <div className={styles.sponsorSlot}>
              <span>+</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const weekly = useWeeklyDownloads('use-mask-input');
  const gzip = useGzipSize('use-mask-input');
  const stars = useGithubStars('eduardoborges/use-mask-input');
  const downloadsDisplay = formatDownloads(weekly.value ?? FALLBACK_WEEKLY);
  const sizeDisplay = formatBytes(gzip.value ?? FALLBACK_GZIP_BYTES);
  const starsDisplay = formatCompact(stars.value ?? FALLBACK_STARS);

  return (
    <section className={styles.stats}>
      <div className={styles.statsInner}>
        <div className={styles.stat}>
          <StatValue value={downloadsDisplay} loading={weekly.loading} />
          <div className={styles.statLabel}>weekly downloads</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <StatValue value={sizeDisplay} loading={gzip.loading} />
          <div className={styles.statLabel}>min + gzip</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <StatValue value={starsDisplay} loading={stars.loading} />
          <div className={styles.statLabel}>github stars</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statValue}>TS</div>
          <div className={styles.statLabel}>first class</div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="use-mask-input — Input masks for React"
      description="A tiny React hook for elegant input masks. Works with plain inputs, React Hook Form, TanStack Form, and Ant Design."
    >
      <main className={styles.homepage}>
        <Hero />
        <Examples />
        <Features />
        <Sponsors />
        <Stats />
      </main>
    </Layout>
  );
}
