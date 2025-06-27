package common

// Error messages
const (
	// Generic errors
	ErrInvalidInput      = "Dữ liệu đầu vào không hợp lệ"
	ErrInternalServer    = "Lỗi máy chủ nội bộ"
	ErrNotFound          = "Không tìm thấy tài nguyên"
	ErrUnauthorized      = "Người dùng chưa được xác thực"
	ErrInvalidID         = "ID không hợp lệ"
	ErrRequiredFields    = "Các trường bắt buộc bị thiếu"

	// Expense Categories errors
	ErrFetchExpenseCategories = "Lỗi khi lấy danh sách danh mục chi phí"
	ErrCountExpenseCategories = "Lỗi khi đếm số danh mục chi phí"
	ErrCreateExpenseCategory  = "Lỗi khi tạo danh mục chi phí"
	ErrUpdateExpenseCategory  = "Lỗi khi sửa danh mục chi phí"
	ErrDeleteExpenseCategory  = "Lỗi khi xóa danh mục chi phí"
	ErrExpenseCategoryNotFound = "Không tìm thấy danh mục chi phí"
	ErrExpenseCategoryNameRequired = "Trường 'tên' là bắt buộc và không được để trống"

	// Containers errors
	ErrFetchContainers = "Lỗi khi lấy danh sách container"
	ErrCountContainers = "Lỗi khi đếm số container"
	ErrCreateContainer = "Lỗi khi tạo container"
	ErrUpdateContainer = "Lỗi khi sửa container"
	ErrDeleteContainer = "Lỗi khi xóa container"
	ErrContainerNotFound = "Không tìm thấy container"
	ErrContainerCategoryRequired = "Trường 'danh mục' là bắt buộc và không được để trống"

	// Tractors errors
	ErrFetchTractors = "Lỗi khi lấy danh sách đầu kéo"
	ErrCountTractors = "Lỗi khi đếm số đầu kéo"
	ErrCreateTractor = "Lỗi khi tạo đầu kéo"
	ErrUpdateTractor = "Lỗi khi sửa đầu kéo"
	ErrDeleteTractor = "Lỗi khi xóa đầu kéo"
	ErrTractorNotFound = "Không tìm thấy đầu kéo"
	ErrTractorLicensePlateRequired = "Trường 'biển số xe' là bắt buộc và không được để trống"

	// Trailers errors
	ErrFetchTrailers = "Lỗi khi lấy danh sách rơ moóc"
	ErrCountTrailers = "Lỗi khi đếm số rơ moóc"
	ErrCreateTrailer = "Lỗi khi tạo rơ moóc"
	ErrUpdateTrailer = "Lỗi khi sửa rơ moóc"
	ErrDeleteTrailer = "Lỗi khi xóa rơ moóc"
	ErrTrailerNotFound = "Không tìm thấy rơ moóc"
	ErrTrailerLicensePlateRequired = "Trường 'biển số xe' là bắt buộc và không được để trống"

	// Tractor Expenses errors
	ErrFetchTractorExpenses = "Lỗi khi lấy danh sách chi phí đầu kéo"
	ErrCountTractorExpenses = "Lỗi khi đếm số chi phí đầu kéo"
	ErrCreateTractorExpense = "Lỗi khi tạo chi phí đầu kéo"
	ErrUpdateTractorExpense = "Lỗi khi sửa chi phí đầu kéo"
	ErrDeleteTractorExpense = "Lỗi khi xóa chi phí đầu kéo"
	ErrTractorExpenseNotFound = "Không tìm thấy chi phí đầu kéo"
	ErrUserIDNotFound = "Không tìm thấy ID người dùng trong ngữ cảnh"

	// Expense Items errors
	ErrCreateExpenseItem = "Lỗi khi tạo khoản chi phí"
	ErrUpdateExpenseItem = "Lỗi khi sửa khoản chi phí"
	ErrDeleteExpenseItem = "Lỗi khi xóa khoản chi phí"
	ErrExpenseItemNotFound = "Không tìm thấy khoản chi phí"

	// Settings errors
	ErrSettingNotFound = "Không tìm thấy cài đặt"
	ErrUpdateSetting = "Lỗi khi sửa cài đặt"

	// Authentication errors
	ErrInvalidCredentials = "Tên đăng nhập hoặc mật khẩu không đúng"
	ErrUserNotActive = "Tài khoản người dùng chưa được kích hoạt"
	ErrInvalidToken = "Token không hợp lệ"
	ErrTokenExpired = "Token đã hết hạn"
	ErrCreateUser = "Lỗi khi tạo người dùng"
	ErrUserExists = "Người dùng đã tồn tại"
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
