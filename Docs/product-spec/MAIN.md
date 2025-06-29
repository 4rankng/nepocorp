# Product Specification: Nepo Corp Transportation Management System (TMS)
**Version:** 1.0
**Date:** June 29, 2025
**Status:** Final

---

## 1. Introduction

This document outlines the product requirements for a comprehensive, web-based Transportation Management System (TMS) for Nepo Corp. The company currently manages its container trucking operations, fleet, and finances using a series of disconnected Excel spreadsheets[2][3][4][5]. This manual system is prone to errors, data fragmentation, and is inefficient for reporting and analysis.

The proposed TMS will centralize all operational, fleet, and financial data into a single, integrated platform. The system aims to automate routine tasks, enforce data integrity, provide real-time insights into profitability, and streamline financial management. The primary goal is to replace the existing spreadsheet-based workflow with a robust, scalable, and user-friendly software solution tailored to the company's specific needs.

## 2. User Roles & Personas

The system must support distinct user roles with specific access permissions to ensure data security and operational efficiency.

*   **Management/Owner:** Has full access to all modules, with a focus on high-level dashboards, profitability reports, and financial summaries.
*   **Operations Manager:** Manages the lifecycle of transport jobs, from creation to completion. Responsible for managing routes, pricing, and vehicle/driver assignments.
*   **Accountant:** Manages all financial aspects, including Accounts Receivable (A/R) and Accounts Payable (A/P). Responsible for invoicing, tracking payments, and generating financial reports[2].
*   **Fleet Manager:** Responsible for tracking all vehicle and trailer-related data, including initial costs, maintenance schedules, and logging all operational expenses (fuel, repairs, tires, etc.)[3][4][5][7].
*   **Driver:** (Future role) Can view assigned jobs and potentially log basic trip data like fuel consumption or completed status.

## 3. Functional Requirements

The TMS will be composed of several interconnected modules.

### 3.1. Core Module: Dashboard

A centralized dashboard will serve as the landing page for authenticated users. It should provide a high-level, at-a-glance overview of key business metrics relevant to the user's role.

*   **Key Performance Indicators (KPIs):**
    *   Total number of active jobs.
    *   Total monthly revenue vs. expenses.
    *   Total Accounts Receivable outstanding[2].
    *   Profitability summary by vehicle.
    *   Alerts for overdue invoices or required vehicle maintenance.

### 3.2. Module: Operations Management

This module is the core of daily operations, focused on managing transport jobs.

*   **Job & Order Management:**
    *   Create, view, edit, and search for transportation jobs.
    *   Each job must capture essential information, including:
        *   Customer Name (from the `customers` table)[2].
        *   Job Date(s)[3].
        *   A detailed job description (`Diễn giải`), e.g., "Trả hàng + đóng hàng"[3].
        *   Container Number (`Số cont`)[3].
        *   Assigned Vehicle (`Biển số xe`) and Trailer.
        *   Assigned Route (`Tuyến đường vận chuyển`)[3].
        *   Transportation Revenue (`Cước vận chuyển`)[3].
        *   Job Status (e.g., Planned, In-Progress, Completed, Canceled).

*   **Route & Pricing Management:**
    *   A centralized database for managing all transportation routes, pre-populated from `DINH-MUC-TIEN-DI-DUONG-19-10-2022.xlsx`[1].
    *   The system must store standard road fees for different container types (20', 40').
    *   Must support pricing adjustments like surcharges (`Tăng vé Y/ Lệnh`) and discounts (`Giảm vé QL5`)[1].
    *   Must handle special route types, such as two-way combined shipments (`hàng kết hợp 2 chiều`)[1].

### 3.3. Module: Fleet & Expense Management

This module focuses on managing the company's assets and their associated costs.

*   **Vehicle & Trailer Registry:**
    *   A master list of all tractors (`đầu kéo`) and trailers (`rơ mooc`).
    *   Each vehicle entry must track: License Plate, initial purchase cost, and valuation[4][7].
    *   Must support tracking of ownership structure and capital contributions from partners[4].

*   **Expense Logging:**
    *   Users must be able to log all expenses and associate them with a specific vehicle.
    *   Expense categories must include, but are not limited to: Fuel (`Dầu`), Road Fees (`Đi đường`), Repairs (`Sửa chữa`), Tires (`Lốp`), Engine Oil, and Driver Salaries (`Lương lx`)[3][5].
    *   For fuel expenses, the system must capture both liters and total cost.

*   **Fuel Standards Management:**
    *   The system must incorporate a module for managing fuel consumption standards based on vehicle type, trailer, and load, as defined in `Dinh-muc-dau.xlsx`[6].
    *   This will be used for fuel efficiency reporting by comparing actual vs. standard consumption.

### 3.4. Module: Financial Management

This module is critical for tracking the company's financial health.

*   **Accounts Receivable (A/R) Management:** This will replicate and automate the process currently managed in `CONG-NO-PHAI-THU-2025.xlsx`[2].
    *   **Customer Database:** Maintain a master list of all customers.
    *   **Invoicing:** Generate debit notes (`Giấy báo nợ`) for completed jobs.
    *   **Payment Tracking:** Record customer payments with date, amount, and apply them against outstanding invoices.
    *   **Customer Ledger:** Provide a detailed, real-time ledger for each customer, showing all debits, credits, and a running balance.
    *   **Reporting:** Generate A/R aging reports to manage outstanding debt, with notes indicating the debt's origin month (e.g., "Nợ T4")[2].

*   **Accounts Payable (A/P) Management:**
    *   A module to track liabilities and payments made to vendors (e.g., for major repairs, rent). The "Phải trả" data from the `Tổng hợp` sheet provides the basis for this[2].

*   **Profitability Analysis:**
    *   The system must automatically calculate the gross profit (`Lợi nhuận gộp`) for each vehicle on a monthly and cumulative basis by subtracting total expenses from total revenue[3][4][5].

### 3.5. Module: Reporting & Analytics

The system must provide a suite of reports to support business decisions.

*   **Vehicle Performance Report:** A detailed P&L statement for each vehicle, filterable by date range.
*   **Customer Debt Report:** An A/R aging report to identify and follow up on overdue payments.
*   **Company-wide P&L Report:** A summary of total revenue and expenses across the entire organization.

## 4. Non-Functional Requirements

*   **Language & Localization:** The entire user interface must be in Vietnamese. All dates, currency (VND), and number formats must conform to Vietnamese standards.
*   **Usability:** The UI must be intuitive and easy to navigate for users who are accustomed to Excel.
*   **Security:** Access to modules and data must be strictly controlled by the user's assigned role.
*   **Data Integrity:** The system will use a relational database with constraints to ensure data consistency and prevent duplicate or conflicting entries.
*   **Data Migration:** All historical data from the existing Excel files (`Xe-*.xlsx`, `CONG-NO-PHAI-THU-2025.xlsx`, etc.) must be migrated into the new system as part of the initial setup.

