import Image from "next/image";
import type { Review } from "@/types/product";
import { Icon } from "@/components/basic/Icon";

// Review Card — Phase 4 §8. Rating, reviewer name, verified badge, text,
// optional photo. Consistent structure regardless of star rating.
export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex flex-col gap-2 border-b border-fog py-6 last:border-0">
      <div className="flex items-center gap-2">
        <StarRating rating={review.rating} />
        {review.verifiedPurchase && (
          <span className="inline-flex items-center gap-1 text-[13px] leading-[18px] text-success">
            <Icon size={16} label="">
              <path d="M20 6 9 17l-5-5" />
            </Icon>
            Verified Purchase
          </span>
        )}
      </div>
      <p className="font-semibold text-ink">{review.reviewerName}</p>
      <p className="text-base text-charcoal">{review.text}</p>
      {review.photoUrl && (
        <Image
          src={review.photoUrl}
          alt={`Photo submitted by ${review.reviewerName}`}
          width={64}
          height={64}
          className="rounded-sm object-cover"
        />
      )}
      <time dateTime={review.date} className="text-[13px] leading-[18px] text-stone">
        {new Date(review.date).toLocaleDateString()}
      </time>
    </article>
  );
}

export function StarRating({ rating, outOf = 5 }: { rating: number; outOf?: number }) {
  return (
    <span
      role="img"
      aria-label={`Rated ${rating} out of ${outOf} stars`}
      className="inline-flex items-center gap-0.5"
    >
      {Array.from({ length: outOf }).map((_, i) => (
        <svg
          key={i}
          width={16}
          height={16}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={i < Math.round(rating) ? "fill-secondary-gold" : "fill-fog"}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z" />
        </svg>
      ))}
    </span>
  );
}
