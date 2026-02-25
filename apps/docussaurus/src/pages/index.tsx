import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import DocusaurusCodeBlock from '@theme/CodeBlock';
import styles from './index.module.css';

const INSTALL = 'npm install use-mask-input';

const EXAMPLE = `import { useMaskInput } from 'use-mask-input';

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
      <input {...registerWithMask('cpf', 'cpf')} />
      <button type="submit">Submit</button>
    </form>
  );
}`;

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className={styles.codeBlock}>
      <DocusaurusCodeBlock language="tsx" title={title} children={children} />
    </div>
  );
}

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.heroTitle}>use-mask-input</h1>
        <p className={styles.heroSubtitle}>
          Input masks for React. Works with plain inputs, React Hook Form, and Ant Design.
        </p>

        <div className={styles.install}>
          <code>{INSTALL}</code>
        </div>

        <div className={styles.heroButtons}>
          <Link
            className={clsx('button button--primary button--lg', styles.ctaButton)}
            to="/intro"
          >
            Get Started
          </Link>
          <Link
            className={clsx('button button--outline button--lg', styles.secondaryButton)}
            to="/api-reference"
          >
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function Examples() {
  return (
    <section className={styles.examples}>
      <div className="container">
        <div className={styles.examplesGrid}>
          <CodeBlock title="basic usage" children={EXAMPLE} />
          <CodeBlock title="with react hook form" children={HOOK_FORM_EXAMPLE} />
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statValue}>52k+</div>
            <div className={styles.statLabel}>Weekly Downloads</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>TypeScript</div>
            <div className={styles.statLabel}>First Class</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>~2kb</div>
            <div className={styles.statLabel}>Bundle Size</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout title="use-mask-input" description="Input masks for React">
      <main className={styles.homepage}>
        <Hero />
        <Examples />
        <Stats />
      </main>
    </Layout>
  );
}
