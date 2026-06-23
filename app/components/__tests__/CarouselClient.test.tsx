import React from 'react';
import { render, screen, act } from '@testing-library/react';
import CarouselClient from '../CarouselClient';
import { expect, test, vi } from 'vitest';

vi.mock('next/image', () => {
  return {
    default: (props: any) => <img {...props} />
  };
});

test('renders carousel and advances slides automatically', () => {
  vi.useFakeTimers();
  const { container } = render(<CarouselClient />);

  const currentImage = container.querySelector('.school-carousel-curr');
  expect(currentImage).toHaveAttribute('src', '/images/school-carousel/1.png');

  // Advance time by 5000ms
  act(() => {
    vi.advanceTimersByTime(5000);
  });

  // Fast-forward the transition timeout
  act(() => {
    vi.advanceTimersByTime(500);
  });

  const nextImage = container.querySelector('.school-carousel-curr');
  expect(nextImage).toHaveAttribute('src', '/images/school-carousel/2.png');

  vi.useRealTimers();
});
