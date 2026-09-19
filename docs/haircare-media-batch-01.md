# Silku Hair Care Media Batch 01

## Batch scope

This batch covers the 15 active/visible Hair Care products. Each currently has one verified product-specific SVG packshot. No production media mutation is performed by this batch.

## Completion target per product

- Existing asset: verified SVG packshot.
- Required additional asset A: distinct product-specific secondary/detail image.
- Required additional asset B: product-specific short demonstration video.
- Final gallery order: existing/front image, secondary/detail image, video.
- Variant: Standard unless the production catalog later adds variants.
- Do not count the existing SVG and a duplicate/recolored copy as two distinct images.

## Product shot plans

| # | Product slug | Existing asset | Secondary image focus | Video focus |
|---|---|---|---|---|
| 1 | silku-scalp-balance-shampoo | silku-scalp-balance-shampoo.svg | bottle front/side + shampoo texture | dispensing small amount + scalp/hair cleansing demonstration |
| 2 | silku-anti-dandruff-scalp-shampoo | silku-anti-dandruff-scalp-shampoo.svg | bottle/detail + shampoo texture | scalp-focused application/rinse routine |
| 3 | silku-smooth-hydrate-conditioner | silku-smooth-hydrate-conditioner.svg | conditioner texture + lengths | mid-length/ends application and rinse routine |
| 4 | silku-damage-repair-hair-mask | silku-damage-repair-hair-mask.svg | jar/tub detail + rich texture | mask application to lengths + rinse routine |
| 5 | silku-bond-repair-treatment | silku-bond-repair-treatment.svg | pack detail + leave-on texture | small-dose application to damp lengths |
| 6 | silku-frizz-control-hair-serum | silku-frizz-control-hair-serum.svg | dropper/bottle + serum texture | 1–2 drop application to lengths |
| 7 | silku-heat-shield-hair-serum | silku-heat-shield-hair-serum.svg | bottle detail + serum texture | pre-styling application before heat tool |
| 8 | silku-scalp-strength-serum | silku-scalp-strength-serum.svg | dropper + liquid texture | targeted scalp section application |
| 9 | silku-lightweight-hair-oil | silku-lightweight-hair-oil.svg | bottle/dropper + oil texture | 1–3 drop palm application and smoothing |
| 10 | silku-pre-wash-scalp-oil | silku-pre-wash-scalp-oil.svg | bottle + oil texture | scalp massage/pre-wash routine |
| 11 | silku-leave-in-repair-cream | silku-leave-in-repair-cream.svg | tube/pump + cream texture | damp-length application and comb-through |
| 12 | silku-curl-define-leave-in | silku-curl-define-leave-in.svg | cream texture + packaging detail | application to damp curls/waves and scrunching |
| 13 | silku-volume-boost-shampoo | silku-volume-boost-shampoo.svg | bottle detail + shampoo texture | root-focused shampoo application |
| 14 | silku-color-protect-shampoo | silku-color-protect-shampoo.svg | bottle detail + shampoo texture | gentle cleansing routine for color-treated hair |
| 15 | silku-deep-hydration-conditioner | silku-deep-hydration-conditioner.svg | bottle/detail + rich conditioner texture | application to lengths + rinse routine |

## Required filenames

For every Standard variant:

`<slug>_img2_standard.jpg`
`<slug>_video_standard.mp4`

Examples:

`silku-scalp-balance-shampoo_img2_standard.jpg`
`silku-scalp-balance-shampoo_video_standard.mp4`

## Technical acceptance

### Secondary image
- JPG or PNG.
- Minimum 1500px longest side.
- Distinct from the existing SVG.
- Product identity must be unambiguous.
- No competitor packaging.
- No unrelated hair models/products used as the primary subject.
- No unsupported treatment/growth claims.

### Video
- MP4/H.264 preferred.
- 15–45 seconds.
- 1080p minimum.
- Product clearly visible.
- Demonstrates packaging, texture, application, or routine.
- No unsupported medical/therapeutic claims.
- Captions/accessibility text must be supported by the storefront gallery.

## Source policy

Real product photography/video is preferred when available from the product/brand source. If a rendered/generated visual is explicitly approved, it must be labelled and treated internally as a rendered visual; it must not be presented as documentary photography of physical inventory.

## QA gate

No asset enters production until:
- product slug is verified;
- product identity is verified;
- asset is genuinely distinct;
- filename is deterministic;
- URL resolves;
- media type/size passes;
- alt text is prepared;
- video has accessible caption support;
- production mapping is reviewed.

## Current batch status

15/15 existing SVG packshots: VERIFIED.

15/15 secondary images: PENDING verified source asset.

15/15 videos: PENDING verified source asset.

Production DB changes in this batch: NONE.
