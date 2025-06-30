package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/handlers"
	"github.com/nepocorp/backend/middleware"
	"github.com/nepocorp/backend/repositories"
	"github.com/sirupsen/logrus"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	"gorm.io/gorm"
)

func Setup(
	r *gin.Engine,
	cfg *config.Config,
	db *gorm.DB,
	healthHandler *handlers.HealthHandler,
	authHandler *handlers.AuthHandler,
	userHandler *handlers.UserHandler,
	userRepo *repositories.UserRepository,
	expenseCategoryHandler *handlers.ExpenseCategoryHandler,
	containerHandler *handlers.ContainerHandler,
	tractorHandler *handlers.TractorHandler,
	trailerHandler *handlers.TrailerHandler,
	expenseHandler *handlers.ExpenseHandler,
	maintenanceHandler *handlers.MaintenanceHandler,
	settingHandler *handlers.SettingHandler,
	customerHandler *handlers.CustomerHandler,
	partnerHandler *handlers.PartnerHandler,
	invoiceCategoryHandler *handlers.InvoiceCategoryHandler,
	invoiceHandler *handlers.InvoiceHandler,
	routeHandler *handlers.RouteHandler,
	jobHandler *handlers.JobHandler,
	financialLedgerHandler *handlers.FinancialLedgerHandler,
	fuelStandardHandler *handlers.FuelStandardHandler,
	activityLogHandler *handlers.ActivityLogHandler,
	logger *logrus.Logger,
) {
	// Rate limiter
	rate := limiter.Rate{
		Period: 1,
		Limit:  int64(cfg.RateLimitRPS),
	}
	store := memory.NewStore()
	rateLimiter := limiter.New(store, rate)

	// Public routes
	public := r.Group("/")
	{
		// Apply rate limiting to public routes
		public.Use(mgin.NewMiddleware(rateLimiter))

		// Health check
		public.GET("/healthz", healthHandler.Check)
	}

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Apply rate limiting
		v1.Use(mgin.NewMiddleware(rateLimiter))

		// Auth routes
		auth := v1.Group("/auth")
		{
			// Username/password login
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.JWTAuth(cfg))
		protected.Use(middleware.UserContextMiddleware(db))
		{
			// User profile
			protected.GET("/auth/profile", authHandler.GetProfile)

			// Users
			protected.GET("/users", userHandler.GetAllUsers)
			protected.POST("/users", userHandler.CreateUser)
			protected.GET("/users/:id", userHandler.GetUserByID)
			protected.PUT("/users/:id", userHandler.UpdateUser)
			protected.DELETE("/users/:id", userHandler.DeleteUser)

			// Expense categories
			protected.GET("/expense_category", expenseCategoryHandler.List)
			protected.POST("/expense_category", expenseCategoryHandler.Create)
			protected.PUT("/expense_category/:id", expenseCategoryHandler.Update)
			protected.DELETE("/expense_category/:id", expenseCategoryHandler.Delete)

			// Containers
			protected.GET("/container", containerHandler.List)
			protected.POST("/container", containerHandler.Create)
			protected.PUT("/container/:id", containerHandler.Update)
			protected.DELETE("/container/:id", containerHandler.Delete)

			// Tractors
			protected.GET("/tractor", tractorHandler.List)
			protected.POST("/tractor", tractorHandler.Create)
			protected.PUT("/tractor/:id", tractorHandler.Update)
			protected.DELETE("/tractor/:id", tractorHandler.Delete)

			// Trailers
			protected.GET("/trailer", trailerHandler.List)
			protected.POST("/trailer", trailerHandler.Create)
			protected.PUT("/trailer/:id", trailerHandler.Update)
			protected.DELETE("/trailer/:id", trailerHandler.Delete)

			// Expenses
			protected.GET("/expense", expenseHandler.List)
			protected.POST("/expense", expenseHandler.Create)
			protected.GET("/expense/:id", expenseHandler.GetByID)
			protected.PUT("/expense/:id", expenseHandler.Update)
			protected.DELETE("/expense/:id", expenseHandler.Delete)

			// Expense items
			protected.POST("/expense/:id/item", expenseHandler.CreateItem)
			protected.PUT("/expense/:id/item/:item_id", expenseHandler.UpdateItem)
			protected.DELETE("/expense/:id/item/:item_id", expenseHandler.DeleteItem)

			// Maintenance
			protected.GET("/maintenance", maintenanceHandler.GetAll)
			protected.POST("/maintenance", maintenanceHandler.Create)
			protected.GET("/maintenance/:id", maintenanceHandler.GetByID)
			protected.PUT("/maintenance/:id", maintenanceHandler.Update)
			protected.DELETE("/maintenance/:id", maintenanceHandler.Delete)

			// Settings
			protected.GET("/settings/:key", settingHandler.GetByKey)
			protected.PUT("/settings/:key", settingHandler.UpdateByKey)

			// Customers
			protected.GET("/customers", customerHandler.GetAllCustomers)
			protected.POST("/customers", customerHandler.CreateCustomer)
			protected.GET("/customers/:id", customerHandler.GetCustomerByID)
			protected.PUT("/customers/:id", customerHandler.UpdateCustomer)
			protected.DELETE("/customers/:id", customerHandler.DeleteCustomer)

			// Partners
			protected.GET("/partner", partnerHandler.GetAllPartners)
			protected.POST("/partner", partnerHandler.CreatePartner)
			protected.GET("/partner/:id", partnerHandler.GetPartnerByID)
			protected.PUT("/partner/:id", partnerHandler.UpdatePartner)
			protected.DELETE("/partner/:id", partnerHandler.DeletePartner)

			// Invoice categories
			protected.GET("/invoice_category", invoiceCategoryHandler.List)
			protected.POST("/invoice_category", invoiceCategoryHandler.Create)
			protected.GET("/invoice_category/:id", invoiceCategoryHandler.GetByID)
			protected.PUT("/invoice_category/:id", invoiceCategoryHandler.Update)
			protected.DELETE("/invoice_category/:id", invoiceCategoryHandler.Delete)

			// Invoices
			protected.GET("/invoice", invoiceHandler.List)
			protected.POST("/invoice", invoiceHandler.Create)
			protected.GET("/invoice/:id", invoiceHandler.GetByID)
			protected.PUT("/invoice/:id", invoiceHandler.Update)
			protected.DELETE("/invoice/:id", invoiceHandler.Delete)

			// Invoice items
			protected.POST("/invoice/:id/item", invoiceHandler.AddItem)
			protected.PUT("/invoice/:id/item/:itemId", invoiceHandler.UpdateItem)
			protected.DELETE("/invoice/:id/item/:itemId", invoiceHandler.DeleteItem)

			// Routes
			protected.GET("/route", routeHandler.GetAllRoutes)
			protected.POST("/route", routeHandler.CreateRoute)
			protected.GET("/route/:id", routeHandler.GetRouteByID)
			protected.PUT("/route/:id", routeHandler.UpdateRoute)
			protected.DELETE("/route/:id", routeHandler.DeleteRoute)

			// Jobs
			protected.GET("/job", jobHandler.GetAllJobs)
			protected.POST("/job", jobHandler.CreateJob)
			protected.GET("/job/:id", jobHandler.GetJobByID)
			protected.PUT("/job/:id", jobHandler.UpdateJob)
			protected.DELETE("/job/:id", jobHandler.DeleteJob)
			protected.GET("/job/tractor/:tractorId", jobHandler.GetJobsByTractor)
			protected.GET("/job/customer/:customerId", jobHandler.GetJobsByCustomer)
			protected.GET("/job/status/:status", jobHandler.GetJobsByStatus)

			// Financial Ledger
			protected.GET("/financial-ledger", financialLedgerHandler.GetAllTransactions)
			protected.POST("/financial-ledger", financialLedgerHandler.CreateTransaction)
			protected.GET("/financial-ledger/:id", financialLedgerHandler.GetTransactionByID)
			protected.PUT("/financial-ledger/:id", financialLedgerHandler.UpdateTransaction)
			protected.DELETE("/financial-ledger/:id", financialLedgerHandler.DeleteTransaction)
			protected.GET("/financial-ledger/customer/:customerId", financialLedgerHandler.GetTransactionsByCustomer)
			protected.GET("/financial-ledger/partner/:partnerId", financialLedgerHandler.GetTransactionsByPartner)
			protected.GET("/financial-ledger/type/:type", financialLedgerHandler.GetTransactionsByType)
			protected.GET("/financial-ledger/date-range", financialLedgerHandler.GetTransactionsByDateRange)
			protected.GET("/financial-ledger/customer/:customerId/balance", financialLedgerHandler.GetCustomerBalance)
			protected.GET("/financial-ledger/partner/:partnerId/balance", financialLedgerHandler.GetPartnerBalance)

			// Fuel Standards
			protected.GET("/fuel-standard", fuelStandardHandler.GetAllFuelStandards)
			protected.POST("/fuel-standard", fuelStandardHandler.CreateFuelStandard)
			protected.GET("/fuel-standard/:id", fuelStandardHandler.GetFuelStandardByID)
			protected.PUT("/fuel-standard/:id", fuelStandardHandler.UpdateFuelStandard)
			protected.DELETE("/fuel-standard/:id", fuelStandardHandler.DeleteFuelStandard)
			protected.GET("/fuel-standard/tractor/:tractorId", fuelStandardHandler.GetFuelStandardsByTractor)
			protected.GET("/fuel-standard/tractor/:tractorId/:trailerType/:loadCategory", fuelStandardHandler.GetFuelStandardByTractorAndType)
			protected.GET("/fuel-standard/trailer-type/:trailerType", fuelStandardHandler.GetFuelStandardsByTrailerType)
			protected.GET("/fuel-standard/load-category/:loadCategory", fuelStandardHandler.GetFuelStandardsByLoadCategory)

			// Activity Logs
			protected.GET("/activity-logs", activityLogHandler.GetActivityLogs)
			protected.GET("/activity-logs/my", activityLogHandler.GetMyActivityLogs)
			protected.DELETE("/activity-logs/cleanup", activityLogHandler.CleanupOldLogs)
		}
	}
}
