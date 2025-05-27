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

## Project Structure

The frontend is organized using a **feature-first approach**.

- **`src/features/`**: This is the primary location for business domain logic. Each subdirectory within `src/features/` (e.g., `lich-van-chuyen`, `khach-hang`) represents a distinct feature.
    - Each feature directory is intended to be self-contained and may include its own:
        - `components/`: UI components specific to this feature.
        - `hooks/`: React hooks specific to this feature's logic.
        - `pages/` or view components: Main components representing feature pages or views (e.g., `QuanLyLichVanChuyen.jsx`).
        - `utils/`: Utility functions specific to this feature.
        - `services/`: Functions for interacting with APIs related to this feature (if applicable).
        - `index.js`: Often used to export the main component(s) of the feature.

- **Shared Code**:
    - **`src/components/`**: Globally shared, reusable UI components (e.g., `StandardTable.jsx`, `ConfirmationModal.jsx`).
    - **`src/hooks/`**: Globally shared React hooks (e.g., `useTheme.js`).
    - **`src/utils/`**: Globally shared utility functions (e.g., `format.js`).
    - **`src/contexts/`**: Globally shared application contexts, such as `AuthContext.jsx` for authentication and user information.
    - **`src/shared/`**: Used for specific shared configurations, primarily `src/shared/config/roles.js`. It is generally not used for shared components, hooks, or utils, which have their dedicated top-level directories.
    - **`src/assets/`**: Static assets like images, icons, and global styles.
    - **`src/layouts/`**: Components that define the overall page structure (e.g., `TrangChu.jsx` which might include a top bar and sidebar).
    - **`src/routes/`**: Application routing configuration.
    - **`src/services/`**: Mock API implementations and potentially base API client configurations.

- **`src/pages/`**: While many page-level components are within their respective features, this directory might exist for very top-level pages or pages not fitting a specific business feature (e.g., a generic Not Found page). The primary approach is for features to contain their own main view components.

## Role-Based Access Control (RBAC)

- **Approach**: RBAC is primarily handled *within each feature component* rather than by duplicating entire features for different roles.
- **Mechanism**:
    - The `AuthContext` (located in `src/contexts/AuthContext.jsx`) is the central piece for managing user authentication and role information. Components access this context via the `useAuth()` hook.
    - `useAuth()` provides the `currentUser` object (which includes `currentUser.role`) and helper functions like `hasRole(role)` or `hasAnyRole(rolesArray)`.
    - Roles are defined in `src/shared/config/roles.js`.
- **Implementation**:
    - Feature components use the role information from `useAuth()` to conditionally render UI elements (e.g., show/hide buttons, form fields).
    - Actions (e.g., saving data, deleting items) are also conditionally enabled or disabled based on the user's permissions derived from their role.
    - This strategy allows a single feature component to adapt its presentation and functionality to the currently logged-in user, promoting code reuse and maintainability.

## Technologies

- **Frontend Framework**: React
- **Routing**: React Router DOM
- **Styling**: Primarily Material-UI, with some TailwindCSS used in specific components.
- **Build Tool**: Vite
- **Code Quality**: ESLint, Prettier (Assumed, based on common React project setups)

## Development

- Run linting: `npm run lint` (If configured)
- Format code: `npm run format` (If configured)

## Notes

- This is a frontend-only demo using mock data.
- User authentication is mocked via `AuthContext` and uses `localStorage` to persist session state.
- Business logic and data fetching are simulated using mock services in `src/services/mockData/`.

Vui lòng đọc tài liệu trong `Docs/0001-setup-web.md` để hiểu chi tiết nghiệp vụ và guideline triển khai.
