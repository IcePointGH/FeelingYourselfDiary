import { useState, useEffect, useCallback } from 'react';
import { getNavBlocker, subscribeNavBlock, clearNavBlocker } from '../../hooks/useDraft';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';

/**
 * Renders a styled ConfirmDialog when a useDraft-based in-app
 * navigation block fires (history.pushState / replaceState).
 *
 * Mount once near the top of the app tree — inside <BrowserRouter>
 * so it appears above all page content.
 */
export default function NavigationGuard() {
  const [blocker, setBlocker] = useState(getNavBlocker());

  useEffect(() => {
    return subscribeNavBlock(() => setBlocker(getNavBlocker()));
  }, []);

  const handleConfirm = useCallback(() => {
    blocker?.proceed();
    clearNavBlocker();
    setBlocker(null);
  }, [blocker]);

  const handleCancel = useCallback(() => {
    blocker?.cancel();
    clearNavBlocker();
    setBlocker(null);
  }, [blocker]);

  if (!blocker) return null;

  return (
    <ConfirmDialog
      message="你有未保存的更改，确定要离开吗？"
      confirmLabel="离开"
      cancelLabel="继续编辑"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
