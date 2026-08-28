  </div><!-- /window -->
</div><!-- /stage -->
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script src="/assets/js/shell.js?v=<?= $ASSET_V ?>"></script>
<?php foreach (($PAGE_JS ?? []) as $j): ?>
<script src="/assets/js/<?= $j ?>?v=<?= $ASSET_V ?>"></script>
<?php endforeach; ?>
</body>
</html>
