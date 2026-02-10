import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Build elegant input masks
            <br />
            <span className={styles.heroTitleAccent}>with React</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A powerful, lightweight React hook for creating beautiful input masks.
            Works seamlessly with React Hook Form, Ant Design, and more.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx('button button--primary button--lg', styles.ctaButton)}
              to="/intro"
            >
              Get Started
            </Link>
            <Link
              className={clsx('button button--outline button--lg', styles.secondaryButton)}
              href="https://github.com/eduardoborges/use-mask-input"
              target="_blank"
            >
              View on GitHub
            </Link>
          </div>
        </div>
        <div className={styles.codeExample}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>example.tsx</span>
            </div>
            <pre className={styles.codeContent}>
              <code>{`import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const maskRef = useMaskInput({
    mask: 'phone'
  });

  return (
    <input
      ref={maskRef}
      placeholder="(555) 123-4567"
    />
  );
}`}</code>
            </pre>
          </div>
        </div>
      </div>
    </header>
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
            <div className={styles.statValue}>100%</div>
            <div className={styles.statLabel}>TypeScript</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Dependencies</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>2kb</div>
            <div className={styles.statLabel}>Bundle Size</div>
          </div>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  title: string;
  emoji: string;
  description: React.ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Simple & Intuitive',
    emoji: '✨',
    description: (
      <>
        Clean and straightforward API that feels natural to use. Get started in seconds
        with just a few lines of code.
      </>
    ),
  },
  {
    title: 'Framework Compatible',
    emoji: '🎯',
    description: (
      <>
        Works seamlessly with <strong>React Hook Form</strong>, <strong>React Final Form</strong>,
        and <strong>Next.js</strong>. Perfect for any React project.
      </>
    ),
  },
  {
    title: 'Powerful & Flexible',
    emoji: '🚀',
    description: (
      <>
        Supports multiple mask types: static, optional, dynamic, alias, alternator,
        and preprocessing. Handle any input format you need.
      </>
    ),
  },
  {
    title: 'TypeScript Ready',
    emoji: '💎',
    description: (
      <>
        Full TypeScript support with comprehensive type definitions. Get autocomplete
        and type safety out of the box.
      </>
    ),
  },
  {
    title: 'Lightweight',
    emoji: '📦',
    description: (
      <>
        Minimal bundle size impact. Optimized for performance without sacrificing
        functionality or developer experience.
      </>
    ),
  },
  {
    title: 'Production Ready',
    emoji: '🏆',
    description: (
      <>
        Well tested, actively maintained, and trusted by developers worldwide.
        Ready for your production applications.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem): React.JSX.Element {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className={styles.featureIcon}>{emoji}</div>
      <div className="text--center padding-horiz--md">
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((feature) => {
            const { title, emoji, description } = feature;
            return (
              <Feature
                key={title}
                title={title}
                emoji={emoji}
                description={description}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <main className={styles.homepage}>
      <Hero />
      <Stats />
      <Features />
    </main>
  );
}
