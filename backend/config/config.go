package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server
	Port                    string
	Debug                   bool
	ReadTimeout             time.Duration
	WriteTimeout            time.Duration
	GracefulShutdownTimeout time.Duration

	// Database
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	RunMigrations     bool

	// JWT
	JWTSecret       string
	JWTIssuer       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	// Rate limiting
	RateLimitEnabled bool
	RateLimitRPS     int
	RateLimitBurst   int

	// Activity Logging
	ActivityLogRetentionDays int
	ActivityLogQueueSize     int

	// Casbin
	CasbinModelPath  string
	CasbinPolicyPath string

	// Password Hashing
	HashSecret string
	HashSalt   string
}

func Load() *Config {
	return &Config{
		// Server
		Port:                    getEnv("PORT", "8080"),
		Debug:                   getEnvBool("DEBUG", false),
		ReadTimeout:             getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
		WriteTimeout:            getEnvDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
		GracefulShutdownTimeout: getEnvDuration("SERVER_GRACEFUL_SHUTDOWN_TIMEOUT", 5*time.Second),

		// Database
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "3306"),
		DBUser:            getEnv("DB_USER", "root"),
		DBPassword:        getEnv("DB_PASSWORD", "root"),
		DBName:            getEnv("DB_NAME", "nepo"),
		DBMaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		RunMigrations:     getEnvBool("RUN_MIGRATIONS", false),

		// JWT
		JWTSecret:       getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		JWTIssuer:       getEnv("JWT_ISSUER", "nepo-backend"),
		AccessTokenTTL:  getEnvDuration("JWT_ACCESS_TOKEN_TTL", 24*time.Hour),
		RefreshTokenTTL: getEnvDuration("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour),

		// Rate limiting
		RateLimitEnabled: getEnvBool("RATE_LIMIT_ENABLED", true),
		RateLimitRPS:     getEnvInt("RATE_LIMIT_RPS", 10),
		RateLimitBurst:   getEnvInt("RATE_LIMIT_BURST", 20),

		// Activity Logging
		ActivityLogRetentionDays: getEnvInt("ACTIVITY_LOG_RETENTION_DAYS", 90),
		ActivityLogQueueSize:     getEnvInt("ACTIVITY_LOG_QUEUE_SIZE", 1000),

		// Casbin
		CasbinModelPath:  getEnv("CASBIN_MODEL_PATH", "config/rbac_model.conf"),
		CasbinPolicyPath: getEnv("CASBIN_POLICY_PATH", "config/rbac_policy.csv"),

		// Password Hashing
		HashSecret: getEnv("HASH_SECRET", "default-secret-change-in-production"),
		HashSalt:   getEnv("HASH_SALT", "default-salt-change-in-production"),
	}
}

func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("mysql://%s:%s@%s:%s/%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
