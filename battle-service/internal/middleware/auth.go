package middleware

import (
        "strings"
        jwtPkg "battle-service/pkg/jwt"
        pkgresponse "battle-service/pkg/response"
        "github.com/gin-gonic/gin"
)

func JWTAuth() gin.HandlerFunc {
        return func(c *gin.Context) {
                authHeader := c.GetHeader("Authorization")
                if authHeader == "" { pkgresponse.Error(c, pkgresponse.CodeErrAuth); c.Abort(); return }
                parts := strings.SplitN(authHeader, " ", 2)
                if len(parts) != 2 || parts[0] != "Bearer" { pkgresponse.Error(c, pkgresponse.CodeErrAuth); c.Abort(); return }
                claims, err := jwtPkg.ParseToken(parts[1])
                if err != nil { pkgresponse.Error(c, pkgresponse.CodeErrToken); c.Abort(); return }
                c.Set("user_id", claims.UserID)
                c.Set("username", claims.Username)
                c.Next()
        }
}

func CORS() gin.HandlerFunc {
        return func(c *gin.Context) {
                c.Header("Access-Control-Allow-Origin", "*")
                c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
                if c.Request.Method == "OPTIONS" { c.AbortWithStatus(204); return }
                c.Next()
        }
}
