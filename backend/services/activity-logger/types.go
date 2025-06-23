package activitylogger

// Action types
const (
	ActionLogin          = "login"
	ActionLogout         = "logout"
	ActionCreate         = "create"
	ActionUpdate         = "update"
	ActionDelete         = "delete"
	ActionView           = "view"
	ActionList           = "list"
	ActionExport         = "export"
	ActionStatusChange   = "status_change"
	ActionPasswordChange = "password_change"
)

// Resource types
const (
	ResourceUser        = "user"
	ResourceShipment    = "shipment"
	ResourceVehicle     = "vehicle"
	ResourceCustomer    = "customer"
	ResourcePartner     = "partner"
	ResourceReport      = "report"
	ResourceExpense     = "expense"
	ResourceMaintenance = "maintenance"
)
