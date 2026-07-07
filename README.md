# collettiriccardo.com

Personal website. Static HTML/CSS/JS, no build step, no dependencies to install.

## Structure

```
index.html            single-page site
styles/main.css       all styling
scripts/hero.js       three.js hero background
scripts/app.js        cursor, scroll reveal, lightbox, card tilt
scripts/projects.js   research card visuals and page dynamics
assets/               photos, project media, documents
```

## Development

```sh
python3 -m http.server
# → http://localhost:8000
```

three.js is loaded from a CDN via an import map; all other assets are served locally.
