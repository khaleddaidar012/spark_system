# Spark Engineering ERP System

## Project Overview

Build a complete, professional, responsive web application for **Spark Engineering Company**.

The system will manage:

* Engineering Projects
* Materials & Inventory
* Incoming & Outgoing Money
* Clients
* Suppliers
* Workers
* Project Costs
* Financial Reports
* Statistics Dashboard
* arabic and english languages support

The goal is to make the system **simple, very fast, mobile-friendly, and production-ready**.

---

# Technology Stack

Frontend

* HTML5
* CSS3
* Vanilla JavaScript (No React, No Vue)

Backend

* Node.js
* Express.js

Database

* MongoDB
* Mongoose

Authentication

* JWT
* bcrypt

Deployment Ready

---

# UI / UX Requirements

The design must be:

* Modern
* Clean
* Professional
* Smooth animations
* Fast loading
* Responsive
* Mobile First

Support

* Dark Mode
* Light Mode

Use soft shadows, rounded corners, animated cards, smooth page transitions, loading animations, and professional notifications.

No heavy animations.

Everything should feel smooth.

---

# Login

Simple login page.

Fields

* Username
* Password
* Remember Me

Remember Me keeps the user logged in for 30 days.

---

# Dashboard

Professional dashboard containing:

* Total Projects
* Active Projects
* Finished Projects
* Total Income
* Total Expenses
* Net Profit
* Inventory Value
* Materials Running Low
* Clients Count
* Workers Count

Charts

* Monthly Expenses
* Monthly Income
* Project Cost Comparison
* Most Consumed Materials

Recent Activities

Recent Payments

Recent Expenses

Quick Actions

* Add Income
* Add Expense
* Add Material
* Create Project

---

# Projects Module

Each project contains:

General Information

* Project Name
* Client
* Address
* Start Date
* End Date
* Status
* Budget

Tabs

Overview

Materials

Expenses

Income

Workers

Documents

Notes

Automatically calculate

Project Cost

Project Revenue

Net Profit

Material Cost

Labor Cost

Other Expenses

---

# Materials Module

Manage inventory.

Each material contains

* Name
* Unit
* Purchase Price
* Quantity
* Minimum Quantity

Examples

* Cement
* Sand
* Steel
* Bricks
* Tiles
* Pipes
* Electrical Materials
* Paint
* provideder

When purchasing materials

Increase stock.

When consuming materials in a project

Decrease stock automatically.

Project cost updates automatically.

Low stock warning.

---

# Financial Module

Two sections

Incoming Money

Outgoing Money

Incoming

Examples

* Client Payment
* Advance
* Other Income

Outgoing

Examples

* Material Purchase
* Salaries
* Equipment
* Fuel
* Rent
* Transportation
* Maintenance

Every transaction must contain

* Amount
* Date
* Project (optional)
* Client/Supplier/Worker
* Category
* Payment Method
* Notes
* Attachment (optional)

---

# Mobile Quick Entry

This is one of the most important features.

The financial entry process must take no more than 3–4 taps.

Floating Action Button (+)

Options

* Add Income
* Add Expense
* Add Material Usage

Example

Tap +

↓

Expense

↓

Choose Project

↓

Enter Amount

↓

Save

Done.

No unnecessary screens.

Optimized for one-hand mobile use.

---

# Clients

Each client contains

* Name
* Phone
* Address
* Notes

Client page shows

Projects

Payments

Remaining Balance

Invoices

Statement of Account

Generate PDF.

---

# Workers

Each worker contains

* Name
* Phone
* Job
* Daily Wage

Track

Paid

Remaining

Attendance (optional)

---

# Suppliers

Manage suppliers.

Track

Purchases

Payments

Remaining Balance

Phone

Address

---

# Reports

Daily

Weekly

Monthly

Yearly

Reports

Project Costs

Material Consumption

Income

Expenses

Profit

Client Payments

Supplier Balances

Worker Payments

Export

PDF

Excel

Print

---

# Statistics Dashboard

Display

Project Cost

Project Revenue

Net Profit

Profit Margin

Material Consumption

Most Expensive Project

Most Profitable Project

Highest Expense Category

Highest Income Source

Inventory Value

Monthly Growth

Professional charts.

---

# Activity Log (Audit Log)



Examples

Project Created

Expense Added

Payment Deleted

Material Edited

---



# Notifications

Show beautiful toast notifications.

Examples

Saved Successfully

Deleted Successfully

Backup Completed

Low Inventory

Error

---

# Search

Global search.

Search projects.

Clients.

Materials.

Workers.

Invoices.

Expenses.

Everything.

---

# Backup System

Automatic Local Backup every day at 2:00 AM.

Use mongodump.

Save backups in

Backups/

Compress backups.

Keep only the last 30 backups.

Display

Last Backup

Backup Size

Backup Status

Buttons

Create Backup Now

Restore Backup

Download Backup

If backup fails, notify the administrator.

---

# Restore

Allow restoring any previous backup using mongorestore.

Restore should require administrator confirmation.

---

# Security
basic but strong using the suitable liberarry

# Database Collections

users

projects

clients

suppliers

workers

materials

materialTransactions

expenses

income

payments

documents

reports

activityLogs

settings

backups

---

# Code Quality

Clean architecture.

Separate

Routes

Controllers

Models

Services

Middlewares

Utils

Reusable UI components.

Readable code.

Comments only where necessary.

No duplicated code.

---

# Final Goal

Build a lightweight ERP system for an engineering company that is extremely easy to use, especially on mobile devices.

The user should be able to record financial transactions in only a few taps.

The application should look modern, professional, responsive, secure, and scalable while remaining simple enough for daily use by accountants, engineers, and management.
