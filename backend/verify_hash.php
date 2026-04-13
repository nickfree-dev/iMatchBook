<?php
$hash = '$2y$10$pB6IGEffuq5Ij.q7N343MO7d0yh0w8fdnul8zdjXX4CCzSeOnQKJC';
$pass = 'changeme123';
if (password_verify($pass, $hash)) {
    echo "MATCH\n";
} else {
    echo "FAIL\n";
}
