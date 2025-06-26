Table extra_ration
id auto increment
tractor_id int
from_location string
to_location string
allowance float
last_updated_by int (foreign key to user table)
created_at datetime
updated_at datetime
