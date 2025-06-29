package database

import (
	"reflect"

	"github.com/nepocorp/backend/utils"
	"gorm.io/gorm"
)

// RegisterUserTrackingCallbacks registers GORM callbacks to automatically populate LastUpdatedBy fields
func RegisterUserTrackingCallbacks(db *gorm.DB) {
	// Register BeforeCreate callback
	_ = db.Callback().Create().Before("gorm:create").Register("user_tracking:before_create", beforeCreateCallback)

	// Register BeforeUpdate callback
	_ = db.Callback().Update().Before("gorm:update").Register("user_tracking:before_update", beforeUpdateCallback)
}

// beforeCreateCallback sets LastUpdatedBy field before creating records
func beforeCreateCallback(db *gorm.DB) {
	if hasLastUpdatedByField(db.Statement.Dest) {
		setLastUpdatedBy(db)
	}
}

// beforeUpdateCallback sets LastUpdatedBy field before updating records
func beforeUpdateCallback(db *gorm.DB) {
	if hasLastUpdatedByField(db.Statement.Dest) {
		setLastUpdatedBy(db)
	}
}

// hasLastUpdatedByField checks if the model has a LastUpdatedBy field
func hasLastUpdatedByField(dest interface{}) bool {
	if dest == nil {
		return false
	}

	rv := reflect.ValueOf(dest)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	if rv.Kind() == reflect.Slice {
		if rv.Len() > 0 {
			rv = rv.Index(0)
			if rv.Kind() == reflect.Ptr {
				rv = rv.Elem()
			}
		} else {
			return false
		}
	}

	if rv.Kind() != reflect.Struct {
		return false
	}

	rt := rv.Type()
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		if field.Name == "LastUpdatedBy" {
			return true
		}
	}
	return false
}

// setLastUpdatedBy extracts user info from context and sets LastUpdatedBy field
func setLastUpdatedBy(db *gorm.DB) {
	// Try to get user info from context
	userInfo, err := utils.GetUserFromContext(db.Statement.Context)
	if err != nil {
		// If no user context available, skip (for system operations)
		return
	}

	// Get formatted user string
	formattedUser, err := utils.GetFormattedLastUpdatedBy(db, userInfo.ID)
	if err != nil {
		// If can't get user details, use username only
		formattedUser = "@" + userInfo.Username
	}

	// Set the LastUpdatedBy field
	setLastUpdatedByField(db.Statement.Dest, formattedUser)
}

// setLastUpdatedByField sets the LastUpdatedBy field value using reflection
func setLastUpdatedByField(dest interface{}, value string) {
	if dest == nil {
		return
	}

	rv := reflect.ValueOf(dest)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}

	if rv.Kind() == reflect.Slice {
		// Handle slice of models
		for i := 0; i < rv.Len(); i++ {
			item := rv.Index(i)
			if item.Kind() == reflect.Ptr {
				item = item.Elem()
			}
			setFieldValue(item, "LastUpdatedBy", value)
		}
	} else if rv.Kind() == reflect.Struct {
		// Handle single model
		setFieldValue(rv, "LastUpdatedBy", value)
	}
}

// setFieldValue sets a field value using reflection
func setFieldValue(rv reflect.Value, fieldName, value string) {
	field := rv.FieldByName(fieldName)
	if field.IsValid() && field.CanSet() && field.Kind() == reflect.String {
		field.SetString(value)
	}
}
