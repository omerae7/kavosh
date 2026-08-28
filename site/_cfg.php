<?php
/* Asset URLs carry a fingerprint of the assets themselves.

   This used to be a number bumped by hand, and one upload went out
   without the bump: browsers kept the previous panel.js under the same
   ?v=1 URL and ran it against the new markup, which looks for elements
   that release had and this one does not. The panel died on the first
   of them — "Cannot set properties of null" — before a single card was
   filled. A fingerprint cannot be forgotten. */
$ASSET_V = (static function (): string {
    $sig = '';
    foreach (['css', 'js'] as $kind) {
        $files = glob(__DIR__ . '/assets/' . $kind . '/*.' . $kind) ?: [];
        sort($files);
        foreach ($files as $f) {
            $sig .= basename($f) . '|' . @filemtime($f) . '|' . @filesize($f) . ';';
        }
    }
    return $sig === '' ? '1' : substr(md5($sig), 0, 10);
})();
