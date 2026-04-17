# Contributing to ASCII.RAW // CAM_01

First off, thank you for considering contributing to ASCII.RAW! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## Getting Started

1. **Fork the Repository** on GitHub to your own account.
2. **Clone the Project** to your local machine.
3. **Install Dependencies** by running `npm install`.
4. **Create a Branch** for your feature or bug fix: `git checkout -b feature/your-feature-name`.

## Making Changes

- The core math and rendering loops live in `lib/ascii.ts`. If modifying rendering output, ensure performance stays near 15FPS.
- UI components and state logic are largely bundled in `components/AsciiCamera.tsx`.
- CSS is driven by `app/globals.css`. Ensure new styles adhere to the brutalist `theme-raw` guidelines (Monochrome, Pure Red `#F00`, 1px borders).

## Testing

Before submitting a pull request, run a local build and check if everything is functioning:
```bash
npm run build
npm start
```
Test the camera loop, the parameter sliders, the SVG rendering, and file exports (`.txt`, `.png`, `.webm`).

## Creating a Pull Request

- Please outline exactly what your changes do (e.g., optimized dithering loop, added new export format, etc.).
- Ensure your code passes all linting: `npx eslint .`.
- Link to any open issues if applicable.

Feel free to connect on X/Twitter ([@erebuzzz](https://x.com/erebuzzz)) if you want to chat about a major feature before PR-ing.

Enjoy!