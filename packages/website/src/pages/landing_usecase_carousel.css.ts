import styles from '../components/landing_usecase_carousel.module.css';
import { landingUsecases } from '../components/landing_usecases';

export function GET() {
  const count = landingUsecases.length;
  const keyframes = landingUsecases.flatMap((_, index) => {
    const position = `translateY(-${index * 100 / (count + 1)}%)`;
    return [
      `${index * 100 / count}% { transform: ${position}; }`,
      `${(index + 0.8) * 100 / count}% { transform: ${position}; }`,
    ];
  });
  keyframes.push(`100% { transform: translateY(-${count * 100 / (count + 1)}%); }`);

  const animation = count > 1 ? `
    @media (prefers-reduced-motion: no-preference) {
      .${styles.usecase_carousel} { animation: cycle-words ${count * 3}s infinite; }
    }
    @keyframes cycle-words { ${keyframes.join('\n')} }
  ` : '';

  return new Response(animation, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
}
