<?php
require dirname(__DIR__) . '/api/_boot.php';
$_SESSION = [];
session_destroy();
header('Location: /panel/login.php');
