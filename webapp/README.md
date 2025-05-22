# Nepocorp Transport Management System

A frontend demo for the Nepocorp Transport Fleet Management System. This application provides interfaces for different roles in the transport management workflow.

## Setup and Installation

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nepocorp.git
   cd nepocorp/webapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Open your browser and navigate to: http://localhost:5173
   - Login with one of the test accounts listed below

## Test Accounts

Use these credentials to test different roles in the application:

### Quản Lý (Manager)
- **Username:** quanly
- **Password:** password123
- **Features:** Create transport plans, view financial reports, manage customer relationships

### Kế Toán (Accountant)
- **Username:** ketoan
- **Password:** password123
- **Features:** Manage vehicle costs, track debts, generate financial reports

### Giao Nhận (Logistics)
- **Username:** giaonhan
- **Password:** password123
- **Features:** Track shipments, update delivery status, manage container information

### Lái Xe (Driver)
- **Username:** laixe
- **Password:** password123
- **Features:** View assigned trips, update trip status, record expenses

## Application Structure

- `src/components/`: Reusable UI components
  - `TopBar.jsx`: Main navigation header
  - `Sidebar.jsx`: Role-specific navigation
  - `UserMenu.jsx`: User profile and settings
  - `ReturnToHomeButton.jsx`: Navigation back to home

- `src/pages/`: Main application pages
  - `Login.jsx`: Authentication page
  - `Home.jsx`: Role selection dashboard
  - `QuanLy.jsx`: Manager interface
  - `KeToan.jsx`: Accountant interface
  - `GiaoNhan.jsx`: Logistics interface
  - `LaiXe.jsx`: Driver interface

- `src/data/`: Mock data for demonstration
  - `mockData.json`: Contains customers, trips, debts, and other business data

- `src/utils/`: Utility functions
  - `format.js`: Formatting helpers for currency, dates, etc.

## Technologies

- **Frontend Framework**: React
- **Routing**: React Router DOM
- **Styling**: TailwindCSS
- **Build Tool**: Vite
- **Code Quality**: ESLint, Prettier

## Development

- Run linting: `npm run lint`
- Format code: `npm run format`

## Notes

- This is a frontend-only demo using mock data
- All data is stored in static JSON files in `src/data/`
- No actual authentication is implemented - any username/password combination will work


Vui lòng đọc tài liệu trong `Docs/0001-setup-web.md` để hiểu chi tiết nghiệp vụ và guideline triển khai.
