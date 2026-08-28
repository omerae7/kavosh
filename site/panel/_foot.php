  </div><!-- /window -->
</div><!-- /stage -->
<footer class="pfoot">© 2026 Brickala. All rights to this website belong to Brickala.</footer>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/shell.js?v=<?= $ASSET_V ?>"></script>
<?php /* The assistant rides on every panel page. The composer builds its
         own page and never reaches this file, which is exactly where it
         should not appear. */ ?>
<script src="/assets/js/assistant-brain.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/chat.js?v=<?= $ASSET_V ?>"></script>
<?php foreach (($PAGE_JS ?? []) as $j): ?>
<script src="/assets/js/<?= $j ?>?v=<?= $ASSET_V ?>"></script>
<?php endforeach; ?>
</body>
</html>
