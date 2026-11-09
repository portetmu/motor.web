<?php
/**
 * C & A Motorcycle Shop Management System - Baguio City
 * Database Configuration (PHP 8.1+ PDO with Prepared Statements & Transactions)
 */
declare(strict_types=1);

namespace CAMotorcycleShop\Config;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $db   = getenv('DB_NAME') ?: 'ca_motorcycle_shop';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') ?: '';
            $charset = 'utf8mb4';

            $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                error_log('Database Connection Error: ' . $e->getMessage());
                http_response_code(500);
                exit(json_encode(['error' => 'Database connection failed.']));
            }
        }
        return self::$instance;
    }
}
