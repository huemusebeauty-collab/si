# Silku Product Media Source Request Pack

## Purpose

This document is the controlled intake specification for production product media. It prevents unrelated, generic, duplicate, or unverified media from entering the live catalog.

## Production acceptance standard

Every active/visible product must eventually have:

1. Image 1 — front/main product view.
2. Image 2 — secondary/detail/usage view.
3. Video — short product-focused demonstration.
4. Correct product and variant mapping where applicable.
5. Accessible alt text and deterministic filenames.
6. Verified source identity before production upload.

Generated/rendered visuals may be used only when explicitly approved as rendered product visuals. They must never be represented as real product photography.

## Asset specifications

### Images
- JPG or PNG.
- Minimum 1500px on the longest side.
- Product clearly identifiable.
- Clean background for the primary image.
- Secondary image should show a meaningful detail, texture, application, back/side packaging, or usage context.
- No competitor branding.
- No unrelated products.
- No category/collection/hero images.
- No duplicate crops counted as separate images.

### Video
- MP4/H.264 preferred.
- 15–45 seconds.
- 1080p minimum.
- Product must remain identifiable.
- Demonstrate a real product feature, texture, application, packaging, or use.
- No unrelated stock footage.
- No fabricated product claims.
- Caption track/accessible text required by the storefront implementation.

## Deterministic naming

Use:

`<product-slug>_img1_<variant>.jpg`
`<product-slug>_img2_<variant>.jpg`
`<product-slug>_video_<variant>.mp4`

For products without variants, use `default`.

## Current verified assets

- 15 Hair Care product-specific SVG packshots are already verified in `frontend/public/products/`.
- Silku Nail Lacquer has 3 verified JPG/JPEG shade assets.
- These existing verified assets must not be overwritten or replaced with generic media.

## Current media gaps

The following 26 production products still require verified source media:

- flush-of-rose-blush
- silku-velvet-body-lotion
- silku-smooth-body-polish
- silku-refresh-body-wash
- silku-melt-away-cleansing-balm
- silk-finish-compact-powder
- brighten-up-concealer
- silku-bright-eye-gel
- precision-liquid-eyeliner
- silku-cloud-clay-face-mask
- silku-polish-glow-exfoliator
- silku-gentle-barrier-face-wash
- second-skin-foundation
- champagne-glow-highlighter
- midnight-kajal-pencil
- silku-soft-shield-lip-balm
- glass-shine-lip-gloss
- plum-velvet-lipstick
- volume-lash-mascara
- silku-barrier-cloud-moisturizer
- muse-rose-nail-lacquer
- smooth-canvas-primer
- silku-niacinamide-serum
- silku-barrier-repair-cream
- silku-daily-shield-spf-50
- silku-hydra-prep-toner

## Partial-media products

- 15 Hair Care products: 1 verified SVG each; still need 2-image + video completion.
- silku-nail-lacquer: 3 verified images; still needs a product-specific video.
- muse-rose-nail-lacquer: no verified media.

## QA gate

Before production DB mapping, verify:

- [ ] Product identity matches exactly.
- [ ] Variant/shade/size matches exactly when applicable.
- [ ] Two images are genuinely distinct.
- [ ] Video is product-specific.
- [ ] No unrelated or generic image reuse.
- [ ] No unsupported claims.
- [ ] File format and size are valid.
- [ ] Alt text is accurate.
- [ ] GitHub asset URL resolves.
- [ ] Production URL/API mapping is correct.
- [ ] Final catalog audit passes.

## Production rule

Do not populate missing production media merely to make a count look complete. A product remains media-pending until its source assets pass this acceptance gate.
