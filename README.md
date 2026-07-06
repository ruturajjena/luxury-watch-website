# Built By Ruturaj — The Anatomy of Precision

An immersive, scroll-driven digital product film. The user's scroll disassembles an
ultra-luxury mechanical watch across 12 cinematic scenes, then reassembles it into
the **Built By Ruturaj** brand reveal.

## Run it

```bash
node server.js
# → http://localhost:5090
```

The bundled `server.js` is a zero-dependency static server with HTTP **Range**
support — required for frame-accurate video scrubbing. Any production host
(Netlify, Vercel, nginx, S3/CloudFront) supports range requests out of the box;
just deploy the folder as static files.

## How it works

- **12 scenes, 7 films.** `js/main.js` holds a `SCENES` script table mapping each
  scroll segment to a video and a time range. One fixed full-screen stage holds all
  `<video>` elements; scroll position scrubs `currentTime` with inertia (lerp), and
  adjacent scenes that use different files cross-dissolve over the last 10% of the
  scene — the cut is invisible.
- **All-intra encoding.** `assets/video/v*.mp4` are re-encoded from the originals
  with a keyframe on *every* frame (`ffmpeg -g 1 -bf 0`), which makes seeking
  instant in every direction. Source files in `Youtube/video2/raw from gemini/`
  are untouched. (`video7.mp4` is a byte-identical duplicate of `video6.mp4`, so
  it's intentionally unused.)
- **Choreography.** Lenis (inertial scroll) + GSAP ScrollTrigger (scrubbed scene
  timelines) + SplitType (character-level headline reveals).
- **Atmosphere.** Mouse-reactive specular + gold lighting (blend-mode screen),
  perspective tilt on the stage (strongest in the exploded view), canvas dust
  particles with depth parallax, animated film grain, letterbox bars, vignette,
  per-scene scrim, breathing idle motion, magnetic buttons, custom cursor.
- **Performance.** Only the active video (plus the incoming one during a
  crossfade) is visible/composited; other reels are `visibility:hidden` and warm
  lazily — staggered after load and by scroll proximity. All motion is
  transform/opacity (GPU-composited). Reduced-motion and touch devices get a
  simplified experience automatically.

## Customize

- **Social links** — `index.html`, the `.socials` list in the SC.12 block (hrefs
  are `#` placeholders).
- **Book a Project** — currently `mailto:jenaruturaj@gmail.com`; swap for a
  Cal.com/Calendly URL if preferred.
- **View My Work** — currently replays the film (scrolls to top); point it at a
  portfolio URL when ready.
- **Copy & specs** — scene overlays live in `index.html`; the seven-feature
  sequence is the `FEATURES` array at the top of `js/main.js`.
- **Scene pacing** — the `height` of each `#sc*` spacer section in `index.html`
  controls how much scroll each scene takes; the `SCENES` table in `js/main.js`
  controls which film/time-range plays and per-scene tilt/darkness.
