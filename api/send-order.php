<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'message' => 'Метод не поддерживается.']);
}

if (!empty($_POST['website'])) {
    respond(400, ['ok' => false, 'message' => 'Заявка отклонена.']);
}

$localConfigPath = __DIR__ . '/config.local.php';
$localConfig = is_file($localConfigPath) ? require $localConfigPath : [];

$token = (string) ($localConfig['telegram_bot_token'] ?? getenv('COMINT_TELEGRAM_BOT_TOKEN') ?: '');
$chatId = (string) ($localConfig['telegram_chat_id'] ?? getenv('COMINT_TELEGRAM_CHAT_ID') ?: '');

if ($token === '' || $chatId === '') {
    respond(500, ['ok' => false, 'message' => 'Сервис заявок пока не настроен.']);
}

$name = trim((string) ($_POST['name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$comment = trim((string) ($_POST['comment'] ?? ''));
$service = trim((string) ($_POST['service'] ?? ''));
$quantity = trim((string) ($_POST['quantity'] ?? ''));
$page = trim((string) ($_POST['page'] ?? ''));

if ($phone === '') {
    respond(422, ['ok' => false, 'message' => 'Укажите номер телефона.']);
}

if ($comment === '' && $service === '') {
    respond(422, ['ok' => false, 'message' => 'Добавьте описание заявки.']);
}

function escapeTelegramHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function telegramRequest(string $token, string $method, array $fields): array
{
    if (!function_exists('curl_init')) {
        respond(500, ['ok' => false, 'message' => 'На сервере не включён модуль cURL.']);
    }

    $handle = curl_init('https://api.telegram.org/bot' . $token . '/' . $method);
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $fields,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
    ]);

    $body = curl_exec($handle);
    $error = curl_error($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    curl_close($handle);

    if ($body === false || $error !== '') {
        respond(502, ['ok' => false, 'message' => 'Telegram временно недоступен.']);
    }

    $result = json_decode($body, true);
    if (!is_array($result) || empty($result['ok'])) {
        error_log('Telegram API error: ' . $body);
        respond($status >= 400 ? 502 : 500, ['ok' => false, 'message' => 'Не удалось отправить заявку менеджеру.']);
    }

    return $result;
}

$requestId = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
$lines = [
    '<b>Новая заявка с сайта #' . $requestId . '</b>',
    '',
    '<b>Имя:</b> ' . escapeTelegramHtml($name !== '' ? $name : 'не указано'),
    '<b>Телефон:</b> ' . escapeTelegramHtml($phone),
];

if ($service !== '') {
    $lines[] = '<b>Услуга:</b> ' . escapeTelegramHtml($service);
}

if ($quantity !== '') {
    $lines[] = '<b>Размер тиража:</b> ' . escapeTelegramHtml($quantity);
}

$lines[] = '<b>Комментарий:</b> ' . escapeTelegramHtml($comment !== '' ? $comment : 'не указан');

if ($page !== '') {
    $lines[] = '<b>Страница:</b> ' . escapeTelegramHtml($page);
}

telegramRequest($token, 'sendMessage', [
    'chat_id' => $chatId,
    'text' => implode("\n", $lines),
    'parse_mode' => 'HTML',
]);

if (isset($_FILES['file']) && is_array($_FILES['file']) && (int) ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $file = $_FILES['file'];
    $maxBytes = 20 * 1024 * 1024;
    $errorCode = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

    if ($errorCode !== UPLOAD_ERR_OK || !is_uploaded_file((string) $file['tmp_name'])) {
        respond(422, ['ok' => false, 'message' => 'Не удалось принять вложение.']);
    }

    if ((int) $file['size'] > $maxBytes) {
        respond(422, ['ok' => false, 'message' => 'Файл слишком большой. Максимальный размер — 20 МБ.']);
    }

    $originalName = basename((string) $file['name']);
    $mimeType = function_exists('mime_content_type')
        ? (string) mime_content_type((string) $file['tmp_name'])
        : 'application/octet-stream';

    telegramRequest($token, 'sendDocument', [
        'chat_id' => $chatId,
        'caption' => 'Файл к заявке #' . $requestId . ': ' . $originalName,
        'document' => new CURLFile((string) $file['tmp_name'], $mimeType, $originalName),
    ]);
}

respond(200, [
    'ok' => true,
    'message' => 'Заявка отправлена. Менеджер свяжется с вами.',
    'request_id' => $requestId,
]);
