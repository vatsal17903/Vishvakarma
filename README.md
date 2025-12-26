# Vishvakarma CRM - Frontend

React + Vite frontend for Vishvakarma CRM system - A complete CRM solution for Construction & Interior businesses.

## 🚀 Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite 6
- **Routing:** React Router v6
- **Styling:** CSS
- **HTTP Client:** Fetch API

## 📋 Features

- ✅ User Authentication & Authorization
- ✅ Company Management
- ✅ Client Management
- ✅ Package Management (Service Packages)
- ✅ Quotation Generation with Custom Columns
- ✅ Receipt Management
- ✅ Bill Management
- ✅ PDF Generation (Quotations, Receipts, Bills)
- ✅ Reports & Analytics
- ✅ Square Foot Default Settings
- ✅ Multi-company Support

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Backend API running (see [backend repository](https://github.com/vatsal17903/vishvakarma-backend))

### Installation

1. **Clone the repository:**
   ```bash
   git clone git@github.com:vatsal17903/Vishvakarma.git
   cd Vishvakarma
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**

   Copy the example environment file:
   ```bash
   cp .env.example .env.development
   ```

   For local development, you can leave it empty (uses Vite proxy):
   ```env
   VITE_API_URL=
   ```

   Or connect directly to backend:
   ```env
   VITE_API_URL=http://localhost:3006
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173

## 📁 Project Structure

```
/
├── src/
│   ├── components/          # Reusable components
│   │   └── Layout.jsx       # Main layout wrapper
│   ├── context/             # React Context providers
│   │   ├── AuthContext.jsx  # Authentication state
│   │   └── ToastContext.jsx # Toast notifications
│   ├── pages/               # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Clients.jsx
│   │   ├── Quotations.jsx
│   │   └── ... (more pages)
│   ├── utils/               # Utility functions
│   │   └── api.js           # API helper functions
│   ├── config/              # Configuration
│   │   └── api.js           # API URL configuration
│   ├── App.jsx              # Root component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── .env.example             # Environment template
├── .env.development         # Development config
├── .env.production          # Production config
├── vite.config.js           # Vite configuration
├── package.json             # Dependencies
└── README.md                # This file
```

## 🌍 Environment Variables

See [README_ENV.md](./README_ENV.md) for detailed environment configuration.

### Development

Create `.env.development`:
```env
# Leave empty to use Vite proxy
VITE_API_URL=
```

### Production

Create `.env.production`:
```env
# Use your actual backend domain
VITE_API_URL=https://apivkq.softodoor.com
```

## 🏗️ Build for Production

```bash
npm run build
```

This creates a `dist/` folder with optimized production files.

### Preview Production Build

```bash
npm run preview
```

## 🚀 Deployment

### Production Domains

- **Frontend:** https://vishvakarmaquotation.softodoor.com
- **Backend API:** https://apivkq.softodoor.com

### Deployment Steps

1. **Update `.env.production` with backend URL:**
   ```env
   VITE_API_URL=https://apivkq.softodoor.com
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Upload `dist/` folder to your web server**
   - Via FTP, SFTP, or your hosting provider's file manager
   - Point document root to the uploaded files

4. **Configure web server:**
   - Point document root to `dist/` or uploaded location
   - Enable SPA routing (all routes → index.html)
   - Enable HTTPS/SSL

For detailed deployment instructions, see the [backend repository](https://github.com/vatsal17903/vishvakarma-backend) deployment guide.

## 🔌 API Integration

This frontend connects to the Vishvakarma Backend API.

**Backend Repository:** [vishvakarma-backend](https://github.com/vatsal17903/vishvakarma-backend)

### API Helper Functions

```javascript
import { apiGet, apiPost, apiPut, apiDelete } from './utils/api';

// GET request
const response = await apiGet('/api/clients');
const clients = await response.json();

// POST request
const response = await apiPost('/api/clients', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const response = await apiPut('/api/clients/1', { name: 'Updated Name' });

// DELETE request
await apiDelete('/api/clients/1');
```

The API utilities automatically handle:
- Base URL configuration (development vs production)
- Authentication cookies
- JSON headers

## 📱 Features Overview

### Dashboard
- Quick stats overview
- Recent quotations
- Pending bills

### Client Management
- Add/Edit/Delete clients
- Track client projects
- Client contact information

### Package Management
- Create service packages
- Define package items
- Set pricing tiers (Silver, Gold, Platinum)
- BHK-based packages (1 BHK, 2 BHK, 3 BHK, 4 BHK)

### Quotation System
- Generate detailed quotations
- Custom column configuration
- Automatic calculations (subtotal, tax, total)
- PDF export
- Multiple room types

### Receipt & Bill Management
- Track payments
- Generate receipts
- Create bills linked to quotations
- Payment mode tracking

### Reports
- Quotation reports
- Receipt reports
- Client reports
- Date range filtering

## 🔐 Authentication

Default credentials (set on backend):
- **Username:** admin
- **Password:** admin123

**Note:** Change these credentials after first login in production!

## 🛡️ Security Notes

- Never commit `.env` files with sensitive data
- Only commit `.env.example` as a template
- Use HTTPS in production
- Configure CORS properly on backend
- Keep dependencies updated

## 📝 Available Scripts

- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production (output: `dist/`)
- `npm run preview` - Preview production build locally

## 🔗 Related Repositories

- **Backend API:** [vishvakarma-backend](https://github.com/vatsal17903/vishvakarma-backend)

## 🚨 Troubleshooting

### Frontend Can't Connect to Backend

**Solution:**
1. Ensure backend is running
2. Check `VITE_API_URL` in your `.env` file
3. Verify Vite proxy configuration in `vite.config.js`
4. Check browser console for CORS errors

### Build Fails

**Solution:**
1. Clear node_modules: `rm -rf node_modules`
2. Clear cache: `npm cache clean --force`
3. Reinstall: `npm install`
4. Rebuild: `npm run build`

### Environment Variables Not Working

**Solution:**
1. Ensure variable names start with `VITE_`
2. Restart dev server after changing `.env` files
3. Rebuild for production after changing `.env.production`

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

## 📧 Support

For issues and questions:
- Open an issue in this repository
- Check the [backend repository](https://github.com/vatsal17903/vishvakarma-backend) for API-related issues

---

**Built with ❤️ for Construction & Interior Businesses**
