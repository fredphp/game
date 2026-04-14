package mysql

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/spf13/viper"
)

var DB *sql.DB

func Init(conf *viper.Viper) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=True&loc=Local",
		conf.GetString("mysql.user"), conf.GetString("mysql.password"),
		conf.GetString("mysql.host"), conf.GetInt("mysql.port"),
		conf.GetString("mysql.database"), conf.GetString("mysql.charset"))
	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil { return err }
	DB.SetMaxIdleConns(conf.GetInt("mysql.max_idle_conns"))
	DB.SetMaxOpenConns(conf.GetInt("mysql.max_open_conns"))
	DB.SetConnMaxLifetime(time.Duration(conf.GetInt("mysql.conn_max_lifetime")) * time.Second)
	return DB.Ping()
}

func Close() { if DB != nil { _ = DB.Close() } }
