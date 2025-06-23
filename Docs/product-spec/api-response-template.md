Store all user facing message/error in backend/common/messages.go and backend/common/errors.go

Single record
{
  "status": "success",
  "data": {
    "userId": "12345",
    "name": "John Doe",
    "email": "john.doe@example.com"
  },
  "message": "User retrieved successfully.",
  "errors": null
}

List of records
{
  "status": "success",
  "message": "Users retrieved successfully.",
  "data": [
    {
      "id": 101,
      "name": "Product A"
    },
    {
      "id": 102,
      "name": "Product B"
    }
  ],
  "pagination": {
    "records_count": 521, // total records in db
    "page": 1, // current page
    "limit": 2, // records per page
    "total_pages": 261, // total pages
  }
}


Error response
{
  "status": "error",
  "message": "Invalid input provided.",
  "errors": {
    "code": 4001,
    "message": "The 'email' field is required and cannot be empty."
  }
}

The Role of HTTP Status Codes
This JSON response structure works in conjunction with standard HTTP status codes, which provide the first layer of information about the request's outcome at the transport level . Using appropriate codes is a crucial best practice .

Commonly used HTTP status codes include :

200 OK: The request was successful.

201 Created: A new resource was successfully created.

400 Bad Request: A client-side error, such as invalid input.

401 Unauthorized: The request requires authentication.

404 Not Found: The requested resource could not be found.

500 Internal Server Error: A generic error indicating a problem on the server.
