import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
  size?: number;
}

export default function StarRating({ rating, interactive = false, onChange, size = 18 }: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
          className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          disabled={!interactive}
        >
          <Star
            size={size}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-amber-800'}
          />
        </button>
      ))}
    </div>
  );
}
