package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/spf13/viper"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")

	// IsTokenBlacklisted 用于中间件检查 token 是否在黑名单中
	IsTokenBlacklisted func(ctx interface{}, token string) bool
)

// Claims JWT 载荷
type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	VIPLevel int    `json:"vip_level"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 Access Token
func GenerateToken(userID int64, username string, vipLevel int) (string, error) {
	conf := viper.GetViper()
	secret := conf.GetString("jwt.secret")
	issuer := conf.GetString("jwt.issuer")
	ttl := conf.GetInt("jwt.access_ttl")

	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		VIPLevel: vipLevel,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   username,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(ttl) * time.Second)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateRefreshToken 生成 Refresh Token
func GenerateRefreshToken(userID int64, username string) (string, error) {
	conf := viper.GetViper()
	secret := conf.GetString("jwt.secret")
	issuer := conf.GetString("jwt.issuer")
	ttl := conf.GetInt("jwt.refresh_ttl")

	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   username,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(ttl) * time.Second)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken 解析 Token
func ParseToken(tokenStr string) (*Claims, error) {
	conf := viper.GetViper()
	secret := conf.GetString("jwt.secret")

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
