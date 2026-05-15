import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocusaurusCodeBlock from '@theme/CodeBlock';
import styles from './index.module.css';

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
      title: 'Tiny',
      body: 'Around 2 kb minified + gzipped. Zero runtime dependencies beyond Inputmask.',
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

function Stats() {
  return (
    <section className={styles.stats}>
      <div className={styles.statsInner}>
        <div className={styles.stat}>
          <div className={styles.statValue}>52k+</div>
          <div className={styles.statLabel}>weekly downloads</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statValue}>~2 kb</div>
          <div className={styles.statLabel}>min + gzip</div>
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
        <Stats />
      </main>
    </Layout>
  );
}
