import css from '../components/WordCarousel.module.css?inline';
import styles from '../components/WordCarousel.module.css';
import { carouselWords } from '../components/carousel_words';

export function GET() {
  const count = carouselWords.length;
  const keyframes = carouselWords.flatMap((_, index) => {
    const position = `translateY(-${index * 100 / (count + 1)}%)`;
    return [
      `${index * 100 / count}% { transform: ${position}; }`,
      `${(index + 0.8) * 100 / count}% { transform: ${position}; }`,
    ];
  });
  keyframes.push(`100% { transform: translateY(-${count * 100 / (count + 1)}%); }`);

  const animation = count > 1 ? `
    @media (prefers-reduced-motion: no-preference) {
      .${styles.wordTrack} { animation: cycle-words ${count * 3}s infinite; }
    }
    @keyframes cycle-words { ${keyframes.join('\n')} }
  ` : '';

  return new Response(css + animation, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
}
