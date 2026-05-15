---
description: Generate optimized image-to-video prompts (positive + negative + settings) tuned per tool — HuggingFace Wan 2.2, Kling, Pixverse, Hailuo, Luma, Runway. Default target is HF Wan 2.2 Fast. Built around the rule that the source image defines WHAT and the prompt defines HOW IT MOVES.
---

# /hug-prompt — Image-to-Video Prompt Builder (multi-tool)

When Angelo says `/hug-prompt`, build a complete, ready-to-paste prompt set for image-to-video generation, **routed to the target tool** (default: HF Wan 2.2 14B Fast).

Each tool has different prompt conventions. A formula-style Wan prompt fed to Kling produces stiff results; a natural-language Kling prompt fed to Wan ignores motion. This skill swaps prompt style + settings + UI guidance based on the `--tool` argument.

This skill exists because generic "make it come alive" prompts produce warping, identity drift, and jittery motion across all these tools. The output is THREE blocks: positive prompt, negative prompt, and recommended settings — formatted for the chosen tool.

## Tool routing

Angelo specifies the target via `--tool <name>` or by saying the tool name in his request. If not specified, default to `wan-fast`.

| `--tool` value | Target | URL |
|---|---|---|
| `wan-fast` (default) | HF Wan 2.2 14B Fast (distilled fp8 AOTI) | https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster |
| `wan-5b` | HF Wan 2.2 5B (smaller, faster) | https://huggingface.co/spaces/Wan-AI/Wan-2.2-5B |
| `wan-animate` | HF Wan 2.2 Animate (driver-video based) | https://huggingface.co/spaces/Wan-AI/Wan2.2-Animate |
| `wan-vanilla` | Wan 2.2 full (ComfyUI / Colab / local) | github.com/Wan-Video/Wan2.2 |
| `kling` | Kling AI (66 free credits/day) | https://app.klingai.com |
| `pixverse` | Pixverse (60+90 daily credits) | https://app.pixverse.ai |
| `hailuo` | Hailuo / MiniMax (~3 free clips/day) | https://hailuoai.video |
| `luma` | Luma Dream Machine (~1 free/day, no commercial) | https://lumalabs.ai/dream-machine |
| `runway` | Runway Gen-4.5 (paid, brief trial) | https://runwayml.com |

## Inputs Angelo will give

1. **Scenario description** — one line: who/what + the vibe (e.g., "mother wearing Aduro LED mask enjoying it")
2. **Reference image** (optional but preferred) — path or pasted image. If not provided, ask once. If skipped, build prompt blind from scenario only and flag the limitation.
3. **Target tool** (optional) — defaults to the HF Wan 2.2 14B Fast space. Other accepted: `wan-2.2-5b`, `wan2.2-animate`, `kling`, `runway`. Adjust settings per tool.

## The Wan 2.2 Rule (do not skip)

> **The image defines WHAT. The prompt defines HOW IT MOVES.**

Do NOT re-describe the subject's appearance. Wan reads that from the uploaded image. Re-describing causes the model to *redraw* the subject, which is when faces warp.

Only animate elements that are **already visible** in the reference image. If the image shows a hand at the cheek, you can move the hand. If the image does not show legs, do not animate legs.

## Prompt Formula (in this order)

```
[Motion of subject] + [Motion of secondary elements] + [Camera behavior] +
[Lighting/atmosphere shift] + [Speed & intensity modifier]
```

Target length: **80–120 words**. Shorter = under-described, model improvises. Longer = model ignores tail.

### Component rules

| Component | Use | Avoid |
|---|---|---|
| Subject motion | Concrete verbs: "gently smiles", "slowly turns head 5 degrees", "softly exhales", "blinks once" | Vague: "comes alive", "moves naturally" |
| Secondary motion | Hair sway, fabric drape, hand drift, finger tap, jewelry glint | Anything not visible in the image |
| Camera | "Static shot", "slow push-in 5%", "subtle handheld breathing", "locked-off tripod" | "Cinematic", "dynamic", undefined verbs |
| Lighting | "LED glow cycles green to blue to purple", "soft window light wavers", "candle flicker" | "Beautiful lighting", "moody" |
| Speed | "Slow deliberate pacing", "gentle 5-second arc", "barely perceptible" | "Fast", "energetic" without anchor |

### Anti-warp safeguards (always include)

- "preserve facial features"
- "no zoom" (unless you explicitly want zoom)
- "identity locked"
- "minimal motion" for portraits — Wan over-animates by default

## Negative Prompt Template

Always start with this baseline, then add image-specific terms:

```
warped face, distorted hands, extra fingers, melting features, identity drift,
jitter, flickering, sudden cuts, teleporting, low quality, blurry,
plastic skin, text artifacts, morphing, body deformation
```

**Add for portraits:** `eye distortion, asymmetric eyes, mouth warping, ear deformation`
**Add for hands visible:** `extra fingers, missing fingers, finger fusion, claw hands`
**Add for branded products:** `logo distortion, text smearing, label warping`
**Add for LED/glow elements:** `light bleed, color banding, strobing, harsh flicker`

## Recommended Settings — HF Wan 2.2 14B Fast (zerogpu-aoti)

This is a **distilled fp8 AOTI variant**. It runs at FAR lower steps than vanilla Wan 2.2 because guidance is baked into the weights. Do not apply vanilla Wan 2.2 step counts (20–30) here — they waste time without improving quality.

The actual UI exposes only: **Duration**, **Negative Prompt**, **Seed** (+ Randomize checkbox), **Inference Steps**, **Guidance Scale – high noise stage**, **Guidance Scale 2 – low noise stage**. Resolution and Strength are NOT exposed (fixed by the model). Use these values:

| Setting | Value | Why |
|---|---|---|
| Duration (seconds) | `3.0` first run, `5.0` if motion is good | Slider clamps to 8–80 frames at 16fps. Lower = less ZeroGPU quota burn |
| Inference Steps | **`4`** (this model is "Fast 4 steps Wan 2.2 I2V with Lightning LoRA" — 4 IS the design target). Try `6` if quality lacks. Never above `8`. | The Lightning LoRA distillation is literally trained for 4-step inference. >8 wastes compute AND degrades output. Default UI value of 6 is acceptable, 4 is optimal. |
| Guidance Scale – high noise stage | `1.5–3.0` (default 1.0 = bland) | High-noise expert handles structure; mild guidance sharpens motion adherence |
| Guidance Scale 2 – low noise stage | `1.0–2.0` | Low-noise expert handles detail; keep low to avoid over-saturation |
| Seed | `42` first run | **Uncheck "Randomize seed"** for reproducible iteration |
| Randomize seed | OFF when iterating, ON when exploring | Fixed seed lets you A/B prompt changes |

### ZeroGPU Quota — Critical for Free Tier

Anonymous users get **~80 seconds/day** on the ZeroGPU. A 10-step run uses ~88s and will be REJECTED with "exceeded your ZeroGPU quota."

**Always recommend the user sign into HuggingFace** before generation. Login = ~5× quota + higher priority. Free, no card.

If quota is exhausted:
1. Sign in at [huggingface.co/login](https://huggingface.co/login) — biggest unlock
2. Drop steps to 6 + duration to 3s — ~50s per run, fits anon quota
3. Pivot to alt space (separate counter): [KingNish/wan2-2-fast](https://huggingface.co/spaces/KingNish/wan2-2-fast) or [Wan-AI/Wan-2.2-5B](https://huggingface.co/spaces/Wan-AI/Wan-2.2-5B)
4. Wait the displayed countdown (typically 23h)

### Settings ladder by failure mode (one knob at a time)

| Result | Change |
|---|---|
| Output is too still / no motion | Raise high-noise guidance to 3.5, keep steps |
| Faces/hands warp | Drop steps to 8, drop high-noise guidance to 1.5 |
| Glow flickers / strobes | Drop low-noise guidance to 1.0, add `strobing, harsh flicker` to negative |
| Identity drift (looks different) | Drop high-noise guidance to 1.0 (too high pushes away from image) |
| Motion is jittery | Reduce duration to 2.5s, keep steps at 10 |
| Output looks blurry | Raise steps to 12, keep guidance unchanged |

### Per-tool prompt STYLE (critical — translation rules)

The Wan formula is correct for `wan-*`. For other tools, **rewrite into the native style** before output. Do not paste a Wan-formula prompt into Kling — it produces stiff results.

| Tool | Prompt style | Length | Camera handling | Negative prompt |
|---|---|---|---|---|
| `wan-fast`, `wan-vanilla` | Structured formula (motion + camera + lighting + speed) | 80–120 words | Describe in prompt ("static shot, locked-off tripod") | Always include, comma-separated tags |
| `wan-5b` | Same as Wan formula but shorter | 50–80 words | Describe in prompt | Comma tags |
| `wan-animate` | Brief — model takes motion from driver video | 20–40 words | Driver video controls camera | Brief |
| `kling` | Natural language paragraph, narrative tone | 50–90 words | **Use UI dropdown, NOT prompt** — say "the camera holds still" only as a hint | Field exists, comma tags |
| `pixverse` | Natural language + motion intensity descriptor | 40–70 words | UI has Motion Strength slider | Field exists |
| `hailuo` | Cinematic narrative, can include camera in prose ("camera slowly pushes in") | 40–80 words | In prompt prose | Limited UI field |
| `luma` | Most narrative — full descriptive paragraph | 60–100 words | In prompt prose ("orbit slowly clockwise") | Field exists |
| `runway` | Minimal — UI handles most controls via dropdowns | 20–40 words | UI dropdown ONLY | Limited |

### Per-tool settings reference

| Tool | Steps/Quality | Guidance/Creativity | Duration | Strength |
|---|---|---|---|---|
| `wan-fast` | Steps 6 (raise to 10–12 max), distilled | Dual: high 1.5–3.0, low 1.0–2.0 | 3–5s | n/a (not exposed) |
| `wan-vanilla` | Steps 25–30 | CFG 5.0–6.5 | 5s | 0.85–0.95 |
| `wan-5b` | Steps 15–20 | CFG 4.0–5.0 | 5s | varies |
| `wan-animate` | Steps fixed at 20 | n/a | matches driver | n/a |
| `kling` | Mode: **Standard** (not Pro) on free | Creativity 0.3 (preserve) — 0.7 (creative) | 5s (charges same as 10s on Standard) | n/a |
| `pixverse` | Quality: 540p free / 720p paid | Motion Strength 1–10 (start 4) | 5s | n/a |
| `hailuo` | Quality fixed on free | n/a | 6s fixed | n/a |
| `luma` | Draft on free | n/a | 5s | n/a |
| `runway` | Gen-4.5 only on paid | n/a | 5s or 10s | Image weight slider |

### Quick-pick by use case

| Need | Pick | Why |
|---|---|---|
| Most free generations/day | `kling` (66 credits = ~6 clips) | Best free quota |
| **No watermark** (commercial, FB ads) | `wan-fast` (signed-in HF) | Open source, no watermark |
| Best portrait fidelity | `kling` or `wan-fast` | Both preserve face well |
| Driver-video-based mimicry | `wan-animate` | Built for it |
| Fastest single render | `wan-5b` or `pixverse` | Smaller models |
| One-shot quality, willing to pay | `runway` Gen-4.5 | Industry standard |

## Process Claude follows when invoked

1. Read scenario + image. If image not given, ASK once before generating.
2. Inspect the image (or Angelo's description) to identify:
   - Primary subject (who/what)
   - Visible elements that can move (hands, hair, glow, fabric, eyes if not covered)
   - Lighting sources already in the scene
   - Setting/environment
3. Apply the formula. Write 80–120 words.
4. Build negative prompt: baseline + image-specific additions.
5. Output the three blocks in code fences for easy copy-paste.
6. Add 1-line "What to watch for in output" — the most likely failure mode for THIS prompt (e.g., "if mask glow strobes, drop steps to 20").
7. If on the HF Wan 2.2 14B Fast space, remind: paste positive in **Prompt**, negative in **Negative Prompt**, set strength ≥0.85.

## Output Format (always exactly this)

````markdown
### Positive Prompt
```
<80–120 words following the formula>
```

### Negative Prompt
```
<baseline + image-specific terms>
```

### Settings (HF Wan 2.2 14B Fast UI)
- Duration: <seconds, 0.5–5>
- Inference Steps: <8–12>
- Guidance Scale – high noise stage: <1.5–3.0>
- Guidance Scale 2 – low noise stage: <1.0–2.0>
- Seed: 42 (uncheck Randomize seed for iteration)

### Watch for
<1 sentence: most likely failure mode and the one-knob fix from the settings ladder>
````

## Worked Example — "Mother wearing Aduro LED mask enjoying it"

Reference: woman reclining in spa chair, green-glowing Aduro facial mask, peace-sign hand raised, mask-stand controller visible, ambient blue/purple room light.

### Positive Prompt
```
The woman remains relaxed and reclined, breathing gently and softly,
shoulders rising and falling almost imperceptibly. Her raised hand holding
the peace sign drifts down by two centimeters then settles, fingers
relaxing slightly. The Aduro LED mask glow cycles smoothly from soft green
through teal to gentle blue and back, illuminating her face evenly with
no flicker. The blanket on her lap settles a touch as she sinks deeper
into the chair. Ambient room lighting wavers softly behind her like
candlelight on a wall. Static shot, locked-off tripod, no zoom,
preserve facial features, identity locked, minimal motion,
slow deliberate pacing, peaceful spa atmosphere.
```

### Negative Prompt
```
warped face, distorted hands, extra fingers, finger fusion, claw hands,
melting features, identity drift, eye distortion, mouth warping,
mask logo distortion, text smearing on controller, light bleed,
color banding, strobing, harsh flicker, jitter, sudden cuts,
teleporting, low quality, blurry, plastic skin, body deformation
```

### Settings (HF Wan 2.2 14B Fast UI — Lightning LoRA)
- Duration: **3.0 seconds**
- Inference Steps: **4** (the model is named "Fast 4 steps" — this is the design target)
- Guidance Scale – high noise stage: **2.0**
- Guidance Scale 2 – low noise stage: **1.5**
- Seed: **42** (uncheck Randomize seed)

### Watch for
The peace-sign hand is the highest-risk element — if fingers fuse or twist, keep Steps at 4 and drop **high-noise guidance to 1.5**, then add `hand replication, finger morph` to the negative prompt. **Sign into HuggingFace before generating** — anonymous quota (~80s/day) is tight even at 4 steps.

## Usage notes

- This skill **only writes prompts**. It does not run generation. Angelo pastes the output into the HF Space tab himself.
- Always assume free-tier constraints unless Angelo explicitly says he upgraded to Pro/A100.
- If a generation fails, ask for the failure mode (warp / no motion / identity drift / OOM) and adjust ONE knob at a time. Never rewrite the whole prompt on first failure — change steps OR strength OR negative prompt, in that priority order.
- Bail-bond / Sean-network use cases are valid; this skill is content-agnostic. Any image, any scenario.
