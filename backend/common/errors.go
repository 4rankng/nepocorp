package common

// Error messages
const (
	// Generic errors
	ErrInvalidInput      = "Invalid input provided"
	ErrInternalServer    = "Internal server error"
	ErrNotFound          = "Resource not found"
	ErrUnauthorized      = "User not authenticated"
	ErrInvalidID         = "Invalid ID provided"
	ErrRequiredFields    = "Required fields are missing"
	
	// Expense Categories errors
	ErrFetchExpenseCategories = "Failed to fetch expense categories"
	ErrCountExpenseCategories = "Failed to count expense categories"
	ErrCreateExpenseCategory  = "Failed to create expense category"
	ErrUpdateExpenseCategory  = "Failed to update expense category"
	ErrDeleteExpenseCategory  = "Failed to delete expense category"
	ErrExpenseCategoryNotFound = "Expense category not found"
	ErrExpenseCategoryNameRequired = "The 'name' field is required and cannot be empty"
	
	// Containers errors
	ErrFetchContainers = "Failed to fetch containers"
	ErrCountContainers = "Failed to count containers"
	ErrCreateContainer = "Failed to create container"
	ErrUpdateContainer = "Failed to update container"
	ErrDeleteContainer = "Failed to delete container"
	ErrContainerNotFound = "Container not found"
	ErrContainerCategoryRequired = "The 'category' field is required and cannot be empty"
	
	// Tractors errors
	ErrFetchTractors = "Failed to fetch tractors"
	ErrCountTractors = "Failed to count tractors"
	ErrCreateTractor = "Failed to create tractor"
	ErrUpdateTractor = "Failed to update tractor"
	ErrDeleteTractor = "Failed to delete tractor"
	ErrTractorNotFound = "Tractor not found"
	ErrTractorLicensePlateRequired = "The 'license_plate' field is required and cannot be empty"
	
	// Trailers errors
	ErrFetchTrailers = "Failed to fetch trailers"
	ErrCountTrailers = "Failed to count trailers"
	ErrCreateTrailer = "Failed to create trailer"
	ErrUpdateTrailer = "Failed to update trailer"
	ErrDeleteTrailer = "Failed to delete trailer"
	ErrTrailerNotFound = "Trailer not found"
	ErrTrailerLicensePlateRequired = "The 'license_plate' field is required and cannot be empty"
	
	// Tractor Expenses errors
	ErrFetchTractorExpenses = "Failed to fetch tractor expenses"
	ErrCountTractorExpenses = "Failed to count tractor expenses"
	ErrCreateTractorExpense = "Failed to create tractor expense"
	ErrUpdateTractorExpense = "Failed to update tractor expense"
	ErrDeleteTractorExpense = "Failed to delete tractor expense"
	ErrTractorExpenseNotFound = "Tractor expense not found"
	ErrUserIDNotFound = "User ID not found in context"
	
	// Expense Items errors
	ErrCreateExpenseItem = "Failed to create expense item"
	ErrUpdateExpenseItem = "Failed to update expense item"
	ErrDeleteExpenseItem = "Failed to delete expense item"
	ErrExpenseItemNotFound = "Expense item not found"
	
	// Authentication errors
	ErrInvalidCredentials = "Invalid username or password"
	ErrUserNotActive = "User account is not active"
	ErrInvalidToken = "Invalid token"
	ErrTokenExpired = "Token has expired"
	ErrCreateUser = "Failed to create user"
	ErrUserExists = "User already exists"
)

// Error codes
const (
	// 4xxx - Client errors
	CodeBadRequest       = 4001
	CodeRequiredField    = 4002
	CodeInvalidID        = 4003
	CodeNotFound         = 4004
	CodeInvalidInput     = 4005
	CodeUnauthorized     = 4006
	CodeInvalidExpenseID = 4007
	CodeInvalidItemID    = 4008
	CodeInvalidCredentials = 4009
	CodeUserNotActive    = 4010
	CodeTokenExpired     = 4011
	CodeUserExists       = 4012
	
	// 5xxx - Server errors
	CodeInternalError    = 5001
	CodeDatabaseError    = 5002
	CodeCreateFailed     = 5003
	CodeUpdateFailed     = 5004
	CodeDeleteFailed     = 5005
)