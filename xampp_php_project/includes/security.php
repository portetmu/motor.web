<?php
/**
 * C & A Motorcycle Shop Management System - Baguio City
 * Security Middleware: Session Auth, RBAC, CSRF Protection, XSS Sanitization, and Audit Logging
 * Compliant with Republic Act No. 10173 (Philippine Data Privacy Act of 2012)
 */
declare(strict_types=1);

namespace CAMotorcycleShop\Security;

use PDO;

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
]);

function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $token): bool {
    return isset($_SESSION['csrf_token']) && is_string($token) && hash_equals($_SESSION['csrf_token'], $token);
}

function sanitizeOutput(?string $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function requireRole(array $allowedRoles): void {
    $currentRole = $_SESSION['user_role'] ?? null;
    if (!$currentRole || !in_array($currentRole, $allowedRoles, true)) {
        http_response_code(403);
        exit(json_encode(['error' => 'Forbidden: Insufficient role permissions.']));
    }
}

function createRoleNotification(
    PDO $pdo,
    string $type,
    string $title,
    string $message,
    array $targetRoles,
    ?int $targetCustomerId = null,
    ?string $referenceId = null,
    string $severity = 'info'
): void {
    $stmt = $pdo->prepare(
        'INSERT INTO notifications (id, type, title, message, target_roles, target_customer_id, reference_id, severity)
         VALUES (:id, :type, :title, :message, :target_roles, :target_customer_id, :reference_id, :severity)'
    );
    $stmt->execute([
        ':id'                 => 'NOTIF-' . strtoupper(bin2hex(random_bytes(4))),
        ':type'               => $type,
        ':title'              => $title,
        ':message'            => $message,
        ':target_roles'       => implode(',', $targetRoles),
        ':target_customer_id' => $targetCustomerId,
        ':reference_id'       => $referenceId,
        ':severity'           => $severity,
    ]);
}
