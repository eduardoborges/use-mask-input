import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
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

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.feature)}>
      <div className={styles.featureIcon}>{emoji}</div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
