# Gluten

Gluten \ˈglü-tən\ is a great utility to help you build modular apps.

## Usage

Just run `glue` or `gluten` command inside a directory with your top-level package.

## Configuration

All your modules are configured through the `package.json`.

```js
{
  "name": "you-module-name"
  "main": "index.js",
  "style": "index.css"
}
```

## Features

Gluten uses `browserify` to compile your JS files and `rework-npm` for your CSS files.

There are several `rework` transformers that are used by default:
- `autoprefixer` — vendor prefixes
- `rework-vars` — css variables supports
- `rework-calc` — `calc()`
- `rework-color-function` — easy color modifications

## License

The MIT License
