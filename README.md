# collettiriccardo.com

Personal website. Static HTML/CSS/JS, no build step, no dependencies to install.

## Structure

```
index.html               single-page site
styles/main.css          all styling
scripts/hero.js          three.js hero background
scripts/app.js           scroll reveal, lightbox, card tilt, section title decode
scripts/projects.js      research card visuals and page dynamics
assets/
  photos/me|life|travel|paintings|oftal
  projects/drift|plate   figures and media for the research cards
  where/                 photos for the "where to find me" section
  logos/                 institution logos
  cv.pdf resume.pdf og.png favicon.svg apple-touch-icon.png
```

## Development

```sh
python3 -m http.server
# → http://localhost:8000
```

three.js is loaded from a CDN via an import map; all other assets are served locally.
