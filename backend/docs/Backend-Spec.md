Create backend skeleton service with one endpoint /healthz

Tech Stack: Go  Gin  Gorm Mysql
Middleware: JWT Log Casbin RateLimit
Layers
routes/ : to register routes
handlers/ : to handle request / response format
controllers/ : to handle business logic
services/ : for share business logic
utils/ : for share functionalities
repositories/ : to handle db interaction (most of the db operations can be used with Find (include pagination, search by fields, sort by fields, etc), Create, Update, Delete)
models/ : to define db schema

prefer to use common popular package instead of writing your own
each service should have its own folder eg services/csv-parser/main.go
if multiple files serve the similar purpose, group them in a folder
if a file is longer than 500 lines, split code into multiple files
if you use go build, remove build file after build

write `make local` to start backend locally
write `make db` to start only db
write `make test` to run tests


