# Landing de ejemplo

`demo-landing/` es una landing mínima que usa todo el contrato: `data-site`,
`data-site-href`, `data-site-hide-parent`, placeholders `{{site.x}}` y un formulario
`data-site-form`.

Para probarla:

```bash
cd examples/demo-landing
zip -r ../demo-landing.zip . -x '.*'
```

Sube `demo-landing.zip` en el panel. Nota que el ZIP se comprime desde *dentro* de la
carpeta, de modo que `index.html` queda en la raíz.
