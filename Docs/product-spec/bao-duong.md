# Chi phí xe vận chuyển

Nhap thong tin bao duong

The modal has two column
LEFT COLUMN
- Bien so xe
- Subtotal (auto calculate base on list of items)
- Tax rate (GET /api/v1/settings/tax_rate, frontend load one and store in cache)
- Total (auto calculate)

RIGHT COLUMN
- Default has one empty row with
  * Item name
  * Price (in VND, before tax)
  * Quantity
  * Install date
  * Expiry date
- There is button to add new row
- TextArea to write remark






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
created_by (foreign key to user table)
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

