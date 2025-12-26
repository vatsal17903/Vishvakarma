# Frontend Application

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Server

- **Port:** 5173 (default)
- **URL:** http://localhost:5173
- **Network:** http://192.168.1.53:5173 (accessible from other devices on your network)

## Expected Output

When the development server starts successfully, you should see:

```
VITE v6.4.1  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.53:5173/
➜  press h + enter to show help
```

## Features

- ⚡ **Hot Module Replacement (HMR)** - Changes reflect instantly
- 🔄 **Auto-reload** - Browser refreshes automatically on save
- 📱 **Network access** - Test on mobile devices using the Network URL

## Project Structure

```
src/
├── components/    # Reusable UI components
├── pages/        # Page components (routes)
├── context/      # React context providers
├── App.jsx       # Main app component
├── main.jsx      # Entry point
└── index.css     # Global styles
```

## Default Login

- **Username:** admin
- **Password:** admin123

## Troubleshooting

- **Port already in use:** Vite will automatically use the next available port (5174, 5175, etc.)
- **Missing dependencies:** Run `npm install`
- **API not connecting:** Make sure the backend server is running on port 3006
- **Blank page:** Check browser console for errors

## Making Changes

1. Edit files in `src/`
2. Save the file
3. Browser will automatically reload with your changes ✨

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.
