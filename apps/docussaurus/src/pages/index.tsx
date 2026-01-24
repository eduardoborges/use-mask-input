import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            
            <div className={styles.badges}>
              <a
                href="https://www.npmjs.com/package/use-mask-input"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badge}
              >
                <img
                  src="https://img.shields.io/npm/v/use-mask-input"
                  alt="npm version"
                />
              </a>
              <a
                href="https://www.npmjs.com/package/use-mask-input"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badge}
              >
                <img
                  src="https://img.shields.io/bundlejs/size/use-mask-input?color=green-light"
                  alt="bundle size"
                />
              </a>
              <a
                href="https://www.npmjs.com/package/use-mask-input"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badge}
              >
                <img
                  src="https://img.shields.io/npm/dw/use-mask-input"
                  alt="npm downloads"
                />
              </a>
            </div>

            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg"
                to="/intro">
                Get Started →
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="https://github.com/eduardoborges/use-mask-input"
                target="_blank">
                View on GitHub
              </Link>
            </div>
          </div>
          
          <div className={styles.heroCode}>
            <div className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.codeDot}></span>
                <span className={styles.codeDot}></span>
                <span className={styles.codeDot}></span>
                <span className={styles.codeTitle}>example.tsx</span>
              </div>
              <pre className={styles.codeContent}>
                <code>{`import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '(99) 99999-9999',
  });

  return (
    <input 
      type="tel"
      ref={phoneMask}
      placeholder="(00) 00000-0000"
    />
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A powerful React Hook for building elegant and simple input masks. Compatible with React Hook Form, Next.js, and more.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
