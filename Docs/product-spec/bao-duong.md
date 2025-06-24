# Chi phí xe vận chuyển

Nhap thong tin bao duong

The modal has two column
LEFT COLUMN
- Bien so xe and Payment status (DRAFT, PENDING, PAID, CANCELLED) in one row
- Subtotal (auto calculate base on list of items), Tax rate (prefilled from cache), Total (auto calculate) in one row
- Payment proof (url to payment proof image eg in google drive)

RIGHT COLUMN
- Default has one empty row with
  * Item name
  * Price (in VND, before tax)
  * Quantity
  * Install date
  * Expiry date
- There is button to add new row
- TextArea to write remark

GET /api/v1/settings/tax_rate, frontend load one and store in cache
Table
setttings
id auto increment
key string
value string
last_updated_by int (foreign key to user table)
created_at datetime
updated_at datetime




Table tractor_expenses
cover all expenses including parts, labor, insurance, etc

id auto increment
tractor_id int (foreign key to tractor table)
vendor_name string
expense_category_id int (foreign key to expense_categories table)
subtotal int (in VND)
tax_rate int (later total = subtotal * tax / 100)
total int (in VND)
payment_status string (DRAFT, PENDING, PAID, CANCELLED)
payment_proof string (url to payment proof image eg in google drive)
last_updated_by int (foreign key to user table)
created_at datetime
updated_at datetime

Table tractor_expense_items
id auto increment
tractor_expense_id int (foreign key to tractor_expense table)
item_name string
price int (in VND)
quantity int
total int (in VND)
install_date datetime default null (the date the part / insurance / road fee is installed)
expiry_date datetime default null (the date the part / insurance / road fee expires)
created_at datetime
updated_at datetime

Table expense_categories
id auto increment
name string
created_at datetime
updated_at datetime


## Phương tiện
container
- id // mysql auto increment eg 1, 2, 3, ...
- category: '20DC',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

tractor
- id
- license_plate:  '16C-111.22',
- description: 'Tractor 1',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

trailer
- id // mysql auto increment eg 1, 2, 3, ...
- license_plate:  '16C-111.22',
- description: 'Trailer 1',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',

expense_category
- id // mysql auto increment eg 1, 2, 3, ...
- name: 'Bảo dưỡng',
- created_at: '2023-01-15T08:30:00Z',
- updated_at: '2023-05-20T10:00:00Z',


GET /api/v1/expense_category
POST /api/v1/expense_category
PUT /api/v1/expense_category/:id
DELETE /api/v1/expense_category/:id

GET /api/v1/trailer
POST /api/v1/trailer
PUT /api/v1/trailer/:id
DELETE /api/v1/trailer/:id

GET /api/v1/tractor
POST /api/v1/tractor
PUT /api/v1/tractor/:id
DELETE /api/v1/tractor/:id

GET /api/v1/container
POST /api/v1/container
PUT /api/v1/container/:id
DELETE /api/v1/container/:id

GET /api/v1/tractor_expense
POST /api/v1/tractor_expense

GET /api/v1/tractor_expense/:id
PUT /api/v1/tractor_expense/:id
DELETE /api/v1/tractor_expense/:id

POST /api/v1/tractor_expense/:id/item
PUT /api/v1/tractor_expense/:id/item/:item_id
DELETE /api/v1/tractor_expense/:id/item/:item_id




GET /api/v1/settings/:key (for getting tax rate, key=tax_rate)

  Request:
  Authorization: Bearer <jwt_token>

  Response (Success - 200):
  {
    "success": true,
    "message": "Tax rate retrieved successfully",
    "data": {
      "key": "tax_rate",
      "value": "10",
      "last_updated_by": "admin", // username
      "created_at": "2024-06-24T10:00:00Z",
      "updated_at": "2024-06-24T10:00:00Z",
    }
  }

  Response (Error - 404):
  {
    "success": false,
    "message": "Tax rate setting not found",
    "error": {
      "code": "NOT_FOUND",
      "message": "Tax rate setting not found"
    }
  }



  Request:
  PUT /api/v1/settings/:key (for updating tax rate, key=tax_rate)
  Authorization: Bearer <jwt_token>
  Content-Type: application/json

  {
    "value": "8"
  }

  Response (Success - 200):
  {
    "success": true,
    "message": "Tax rate updated successfully",
    "data": {
      "key": "tax_rate",
      "value": "8",
      "last_updated_by": "manager", // username
      "created_at": "2024-06-24T10:00:00Z",
      "updated_at": "2024-06-24T11:30:00Z",
    }
  }

  Response (Error - 400):
  {
    "success": false,
    "message": "Invalid input",
    "error": {
      "code": "BAD_REQUEST",
      "message": "Value is required and must be a valid number"
    }
  }
