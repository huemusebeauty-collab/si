# Hair Care Generated Media Route — Phase 4L.20.14–4L.20.16

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

## Phase 4L.20.15 Result

A generated 250 mL concept board was produced for the pilot, containing front packshot, secondary water-use view, and a video concept.

QA result: **NOT APPROVED FOR PRODUCTION MAPPING**.

Reasons:
- Composite presentation board, not three individual production assets.
- Synthetic label/details are not independently verified against the production catalog.
- Video area is a still/video-preview concept, not a verified MP4.
- No production DB mapping was made.

## Phase 4L.20.16 Result

A second generated presentation board was produced to attempt the individual-media gate.

QA result: **NOT APPROVED FOR PRODUCTION MAPPING**.

Reasons:
- It remains a composite board rather than individually delivered production files.
- The “video” is a static preview; no actual MP4 file was produced.
- Generated package/label details cannot be treated as verified documentary product information.
- The generated images are concept/rendered visuals and must not be represented as real product photography.
- Therefore the 2-image + 1-video production gate remains open.

No generated asset was promoted to GitHub product media or the production DB.

## Current verified status

- Existing verified Hair Care SVGs: preserved.
- Silku Scalp Balance Shampoo verified production asset: /products/silku-scalp-balance-shampoo.svg
- Additional QA-passed production images: 0
- QA-passed production videos: 0
- Production DB media mutation in this phase: 0
- Admin engineer work: untouched.

## Acceptance Gate Still Open

The pilot requires individually verified:
- silku-scalp-balance-shampoo_img1_standard.jpg
- silku-scalp-balance-shampoo_img2_standard.jpg
- silku-scalp-balance-shampoo_video_standard.mp4

Only assets that pass identity, exact 250 mL specification, technical quality, and authenticity/label QA should be mapped to production.
