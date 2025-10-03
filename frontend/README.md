# Smart Attendance System - Frontend

A modern React-based frontend for the Smart Attendance System with dark theme UI and real-time features.

## Features

- ✅ **Modern Dark Theme** - Beautiful, responsive UI
- ✅ **Teacher Dashboard** - Session management & live attendance
- ✅ **Student Portal** - Bluetooth scanning & attendance submission
- ✅ **Real-time Updates** - Live attendance tracking
- ✅ **Security Validation** - Visual security score feedback
- ✅ **Mobile Responsive** - Works on all devices

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Backend server running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at [http://localhost:3001](http://localhost:3001)

## Usage

### Teacher Workflow
1. Login as Teacher
2. Fill class details (name, period, room)
3. Start Bluetooth session
4. Monitor real-time attendance
5. View security scores and activity logs

### Student Workflow
1. Login as Student with roll number
2. Click "Scan for Beacon"
3. Wait for OTP (auto-received via Bluetooth)
4. Submit attendance within 90 seconds
5. View attendance history

## API Integration

The frontend connects to the backend API at `http://localhost:3000/api`:

- **Sessions**: Create and manage attendance sessions
- **Attendance**: Submit and track attendance records
- **OTP**: Request and validate one-time passwords
- **Security**: Real-time security monitoring

## Components

### `Login.js`
- Role-based authentication (Teacher/Student)
- Clean form interface
- Demo credentials support

### `TeacherDashboard.js`
- Session creation and management
- Live attendance monitoring
- Statistics dashboard
- Activity logging

### `StudentPortal.js`
- Bluetooth beacon scanning simulation
- OTP management
- Attendance submission
- Personal attendance history

## Styling

- **CSS Variables** for consistent theming
- **Responsive Grid Layouts**
- **Modern Animations** and transitions
- **Font Awesome Icons**
- **Inter Font** for clean typography

## Development

### File Structure
```
src/
├── components/
│   ├── Login.js
│   ├── TeacherDashboard.js
│   └── StudentPortal.js
├── App.js
├── App.css
└── index.js
```

### Key Features
- **State Management**: React hooks for session state
- **API Integration**: Fetch API for backend communication
- **Real-time Simulation**: Interval-based attendance updates
- **Local Storage**: User session persistence
- **Error Handling**: Comprehensive error states

## Security Features

- **Device Fingerprinting** simulation
- **Security Score** calculation and display
- **OTP Expiration** with countdown timer
- **Anti-proxy** detection indicators

## Production Build

```bash
# Create optimized production build
npm run build

# The build folder contains static files ready for deployment
```

## Environment Variables

Create `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Ensure backend is running on port 3000
2. Start frontend development server
3. Test both teacher and student workflows
4. Verify real-time features work correctly

## Troubleshooting

### Common Issues

**Connection Refused**
- Ensure backend server is running on port 3000
- Check if proxy is configured correctly

**Blank Page**
- Check browser console for JavaScript errors
- Verify all dependencies are installed

**Styling Issues**
- Hard refresh (Ctrl+F5) to clear cache
- Check if CSS variables are loading correctly
