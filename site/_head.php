<?php
/* One <head> for every page, so tokens, fonts and icons never drift.
   $PAGE_TITLE and $PAGE_CSS are set by the including page. */
$css = $PAGE_CSS ?? [];
?><!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F6F4F1">
<meta name="color-scheme" content="light">
<meta name="format-detection" content="telephone=no">
<title><?= htmlspecialchars($PAGE_TITLE ?? 'بریک کالا', ENT_QUOTES) ?></title>
<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
<link rel="icon" type="image/png" sizes="256x256" href="/assets/img/logo.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/img/apple-touch.png">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/Vazirmatn-Regular.woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/base.css?v=<?= $ASSET_V ?>">
<?php foreach ($css as $c): ?>
<link rel="stylesheet" href="/assets/css/<?= $c ?>?v=<?= $ASSET_V ?>">
<?php endforeach; ?>
</head>
