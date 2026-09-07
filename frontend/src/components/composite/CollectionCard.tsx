import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/types/product";
import { ROUTES } from "@/constants/routes";

// Collection Card — Phase 4 §8. Larger, editorial aspect ratio than Product Card.
export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link href={ROUTES.collection(collection.slug)} className="group block">
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-paper">
        <Image
          src={collection.imageUrl}
          alt={collection.imageAlt}
          fill
          sizes="(max-width: 600px) 100vw, 50vw"
          className="object-cover transition-transform duration-base group-hover:scale-105"
        />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/60 to-transparent p-6">
          <h3 className="font-display text-[24px] leading-8 font-semibold text-white">{collection.name}</h3>
          <p className="text-[16px] leading-6 text-white/90">{collection.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
