# Hair Care Generated Media Route — Phase 4L.20.14

## Purpose

Define the safe route for generated/rendered Hair Care visuals when verified real product photography or video is unavailable.

## Product pilot

- Product: Silku Scalp Balance Shampoo
- Slug: silku-scalp-balance-shampoo
- Production package specification: 250 mL
- Existing verified asset: /products/silku-scalp-balance-shampoo.svg
- Required final media: 2 distinct images + 1 product-specific video

## Rules

1. Generated visuals must be treated as rendered/concept visuals, not documentary photography.
2. The package size and product identity must exactly match the production catalog.
3. No generated visual may introduce an unapproved variant, ingredient claim, SKU, barcode, certification, or package size.
4. No competitor, generic, or unrelated product imagery may be used.
5. Generated assets must be exported as individual production files; workflow boards, mockups, screenshots, or contact sheets are not production media.
6. Final filenames must follow the product-media manifest.
7. Each asset must pass identity, size, variant, quality, accessibility, and mapping QA before any production DB mutation.
8. If video cannot be verified or safely produced as an approved rendered asset, the video requirement remains pending.

## Current Phase Result

Generated workflow/concept boards were created for planning and visual direction only. They are NOT mapped to production because they are composite boards rather than individual product media assets.

Production DB changes: 0.

Existing verified Hair Care SVGs: preserved.

Admin engineer work: untouched.

## Next gate

Produce/export individual approved assets for the pilot product:

- silku-scalp-balance-shampoo_img1_standard.jpg
- silku-scalp-balance-shampoo_img2_standard.jpg
- silku-scalp-balance-shampoo_video_standard.mp4

Then perform QA before mapping to production.
