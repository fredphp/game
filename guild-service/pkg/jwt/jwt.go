package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secret = "jiuzhou-guild-service-jwt-secret-key-2024"
var issuer = "jiuzhou-server"
var accessTTL = 7200
var refreshTTL = 604800

func Init(secretKey, iss string, accTTL, refTTL int) {
	if secretKey != "" { secret = secretKey }
	if iss != "" { issuer = iss }
	if accTTL > 0 { accessTTL = accTTL }
	if refTTL > 0 { refreshTTL = refTTL }
}

type Claims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	VIPLevel int    `json:"vip_level"`
	jwt.RegisteredClaims
}

func GenerateToken(userID int64, username string, vipLevel int) (string, string, error) {
	now := time.Now()
	accessClaims := &Claims{
		UserID: userID, Username: username, VIPLevel: vipLevel,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(accessTTL) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now), Issuer: issuer,
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessStr, err := accessToken.SignedString([]byte(secret))
	if err != nil { return "", "", err }

	refreshClaims := &Claims{
		UserID: userID, Username: username, VIPLevel: vipLevel,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(refreshTTL) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now), Issuer: issuer,
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshStr, err := refreshToken.SignedString([]byte(secret))
	if err != nil { return "", "", err }
	return accessStr, refreshStr, nil
}

func ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil { return nil, err }
	if claims, ok := token.Claims.(*Claims); ok && token.Valid { return claims, nil }
	return nil, fmt.Errorf("invalid token")
}
