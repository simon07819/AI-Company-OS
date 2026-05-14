# NVIDIA Image Setup

AI Company OS uses NVIDIA only for image generation. No OpenAI, Stability or other image provider is required.

## Current requirement

Add the image provider configuration to `.env.local` without committing or displaying secrets:

```env
IMAGE_PROVIDER=nvidia
NVIDIA_IMAGE_ENDPOINT=<endpoint NVIDIA image réel depuis build.nvidia.com>
NVIDIA_IMAGE_MODEL=black-forest-labs/flux.1-dev
```

`NVIDIA_API_KEY` must also be present, but its value must never be printed, logged, copied into screenshots, or committed.

## Expected behavior

If the config is incomplete, `/ceo` must show:

```text
Configuration NVIDIA image incomplète
```

with the exact missing variables. It must not show a fake logo, local SVG, or final image.

If the config is complete, `/ceo` attempts the real NVIDIA image endpoint. A successful generation creates a real image artifact with:

- `providerUsed: nvidia`
- `sourceType: nvidia_image`
- `artifactId`
- `missionId`

## Diagnostics

Run:

```bash
npm run diagnose:nvidia-image
npm run test:nvidia-image:real
```

The real test writes an image to `test-results/nvidia-real-logo-test.png`, `.webp`, or `.jpg` only when NVIDIA returns a valid image larger than 1KB.

The expert UI also exposes:

- `/ceo/expert/diagnostics`
- `Tester NVIDIA Image`
- `Copier config requise`

The copy button includes variable names and placeholders only. It never includes the NVIDIA key value.
