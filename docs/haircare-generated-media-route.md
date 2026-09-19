# Hair Care Generated Media Route — Phase 4L.20.14–4L.20.15

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

A new generated 250 mL concept board was produced for the pilot, containing front packshot, secondary water-use view, and a video concept.

QA result: **NOT APPROVED FOR PRODUCTION MAPPING**.

Reasons:
- The generated output is a composite presentation board, not three individual production assets.
- The individual visual panels are below the required source resolution for the production image gate when separated from the board.
- Some generated panels contain synthetic back-label claims/barcode/details that are not independently verified against the production catalog and therefore cannot be promoted.
- The video area is a still/video-preview concept, not a verified MP4 product video.
- No production DB mapping was made.

Draft crops were created locally only for QA inspection:
- silku-scalp-balance-shampoo_img1_standard.jpg
- silku-scalp-balance-shampoo_img2_standard.jpg

They remain **draft/rejected** and are not in GitHub production media.

Production DB changes: 0.

Existing verified Hair Care SVGs: preserved.

Admin engineer work: untouched.

## Acceptance Gate Still Open

The pilot still requires individually verified:
- silku-scalp-balance-shampoo_img1_standard.jpg
- silku-scalp-balance-shampoo_img2_standard.jpg
- silku-scalp-balance-shampoo_video_standard.mp4

Only assets that pass identity, exact 250 mL specification, technical quality, and authenticity/label QA should be mapped to production.
